#!/usr/bin/env python3
"""Ticket 695: does stopping `pnpm tab:dev` the way T3 Code does leave the tab
servers running?

T3 Code 0.1.2 runs a t3.json script by starting $SHELL with no arguments in a
pty (node-pty) and typing "<command>\\r" into it. Closing that terminal calls
ptyProcess.kill("SIGTERM"), which is kill(<shell pid>, SIGTERM), and then
SIGKILL after DEFAULT_PROCESS_KILL_GRACE_MS (1000 ms) if the shell is still
alive. Mode "t3" does exactly that. Mode "pnpm" is the ticket's case: SIGTERM
to the pnpm process alone, with the terminal left open.

Run from the checkout root, with two free ports:
    python3 .scratch/carry-forward/notes/695-t3-stop-check.py t3   3391 5191
    python3 .scratch/carry-forward/notes/695-t3-stop-check.py pnpm 3392 5192
Mode "pnpm" leaves the servers running: stop them yourself afterwards, or run
it inside a sandboxed Bash call, whose processes end with the call.
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
                return


def listening():
    return {
        p: subprocess.run(["ss", "-ltnH", f"sport = :{p}"], capture_output=True, text=True).stdout.strip() != ""
        for p in ports
    }


def tab_processes():
    ps = subprocess.run(["ps", "-eo", "pid,ppid,pgid,args"], capture_output=True, text=True).stdout
    return [l[:140] for l in ps.splitlines() if any(k in l for k in ("tab:dev", "dev-tab.mjs", "vite.js", "wowsimtbc-", "tsc --noEmit"))]


pump(1)
os.write(fd, (command + "\r").encode())
deadline = time.time() + 600
while time.time() < deadline and not all(listening().values()):
    pump(2)
print("listening before the stop:", listening())
print("\n".join(tab_processes()))

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
    pnpm = subprocess.run(["pgrep", "-f", "^node .*/pnpm tab:dev"], capture_output=True, text=True).stdout.split()
    print("pnpm pid:", pnpm)
    os.kill(int(pnpm[0]), signal.SIGTERM)
pump(5)
print("listening 5 s after the stop:", listening())
print("\n".join(tab_processes()))
t = time.time()
while tab_processes() and time.time() - t < 60:
    pump(1)
left = tab_processes()
print(f"tab processes {'still running' if left else 'all gone'} {time.time() - t + 5:.0f} s after the stop")
print("\n".join(left))
os.close(fd)
