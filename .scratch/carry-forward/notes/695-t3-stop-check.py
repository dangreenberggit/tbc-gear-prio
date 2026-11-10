#!/usr/bin/env python3
"""Ticket 695: does stopping `pnpm tab:dev` the way T3 Code does leave the tab
servers running?

T3 Code 0.1.2 runs a t3.json script by starting $SHELL with no arguments in a
pty (node-pty) and typing " <command>\\r" into it. Closing that terminal calls
ptyProcess.kill("SIGTERM"), which is kill(<shell pid>, SIGTERM), and then
SIGKILL after DEFAULT_PROCESS_KILL_GRACE_MS (1000 ms) if the shell is still
alive. The sources are in the ticket's "## Answer". Mode "t3" does that
sequence. Mode "pnpm" is the ticket's case: SIGTERM to the pnpm process
alone, with the terminal left open.

Run from the checkout root, with two free ports:
    python3 .scratch/carry-forward/notes/695-t3-stop-check.py t3   3391 5191
    python3 .scratch/carry-forward/notes/695-t3-stop-check.py pnpm 3392 5192
Expected: mode "t3" prints "all gone" and both ports False; mode "pnpm" prints
"still running after 60 s" and both ports True. Either mode then stops the
process groups it started, and only those. A first run builds the Go backend,
so it can take a few minutes.
"""
import os, pty, select, signal, subprocess, sys, time

mode, backend_port, frontend_port = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
ports = [backend_port, frontend_port]
command = f"pnpm tab:dev -- --backend-port {backend_port} --frontend-port {frontend_port}"
shell = os.environ.get("SHELL", "/bin/bash")

pid, fd = pty.fork()
if pid == 0:
    os.execvp(shell, [shell])


def pump(secs):
    end = time.time() + secs
    while time.time() < end:
        if select.select([fd], [], [], 0.2)[0]:
            try:
                os.read(fd, 65536)
            except OSError:
                # The terminal has hung up; still wait, so callers' loops keep their pace.
                time.sleep(max(0, end - time.time()))
                return


def listening():
    return {
        p: subprocess.run(["ss", "-ltnH", f"sport = :{p}"], capture_output=True, text=True).stdout.strip() != ""
        for p in ports
    }


def table():
    rows = subprocess.run(["ps", "-eo", "pid=,ppid=,pgid=,args="], capture_output=True, text=True).stdout
    return {int(r.split()[0]): r.strip() for r in rows.splitlines()}


def descendants(root):
    rows = table()
    found, todo = set(), [root]
    while todo:
        parent = todo.pop()
        for p, r in rows.items():
            if int(r.split()[1]) == parent and p not in found:
                found.add(p)
                todo.append(p)
    return found


def alive(pids):
    rows = table()
    return [rows[p][:140] for p in sorted(pids) if p in rows]


pump(1)
os.write(fd, f" {command}\r".encode())
deadline = time.time() + 300
while time.time() < deadline and not all(listening().values()):
    pump(2)
if not all(listening().values()):
    sys.exit(f"the servers never listened: {listening()}")
pump(2)
started = descendants(pid)
groups = {int(table()[p].split()[2]) for p in started if p in table()}
print("listening before the stop:", listening())
print("\n".join(alive(started)))

if mode == "t3":
    os.kill(pid, signal.SIGTERM)
    t = time.time()
    while time.time() - t < 1.0:
        if os.waitpid(pid, os.WNOHANG)[0]:
            break
        pump(0.1)
    else:
        print("the shell is still alive 1 s after SIGTERM; sending SIGKILL")
        os.kill(pid, signal.SIGKILL)
        os.waitpid(pid, 0)
else:
    # The shell's one child is the job it was given: pnpm.
    rows = table()
    pnpm = next(p for p in started if int(rows[p].split()[1]) == pid)
    print("pnpm pid:", pnpm)
    os.kill(pnpm, signal.SIGTERM)

t = time.time()
while alive(started) and time.time() - t < 60:
    pump(1)
left = alive(started)
print(f"still running after 60 s:" if left else f"all gone {time.time() - t:.0f} s after the stop")
print("\n".join(left))
print("listening now:", listening())
for g in groups:
    try:
        os.killpg(g, signal.SIGTERM)
    except ProcessLookupError:
        pass
os.close(fd)
