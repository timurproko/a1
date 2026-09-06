import json
import os
import pty
import signal
import sys

helper, marker_path, result_path, status_path, mode = sys.argv[1:]
child_program = r'''
import json, os, signal, sys, time
marker, mode = sys.argv[1:]
with open(marker, "w", encoding="utf-8") as stream:
    json.dump({"pid": os.getpid(), "processGroup": os.getpgrp(), "foregroundGroup": os.tcgetpgrp(0)}, stream)
if mode == "signaled":
    os.kill(os.getpid(), signal.SIGTERM)
time.sleep(0.2)
'''

initial_path = result_path + ".initial"
guardian_pid, master = pty.fork()
if guardian_pid == 0:
    with open(initial_path, "w", encoding="utf-8") as stream:
        json.dump({"guardianPid": os.getpid(), "initialForeground": os.tcgetpgrp(0)}, stream)
    selected_status = status_path if mode != "status-failure" else os.path.join(status_path, "missing", "status.json")
    arguments = [
        helper,
        "--parent-pid", str(os.getppid()),
        "--instance", "darwin-pty-fixture",
        "--status-file", selected_status,
        "--", sys.executable, "-c", child_program, marker_path, mode,
    ]
    os.execv(helper, arguments)

_, wait_status = os.waitpid(guardian_pid, 0)
with open(initial_path, "r", encoding="utf-8") as stream:
    initial = json.load(stream)
try:
    restored_foreground = os.tcgetpgrp(master)
except OSError:
    restored_foreground = guardian_pid
with open(result_path, "w", encoding="utf-8") as stream:
    json.dump({
        "guardianPid": guardian_pid,
        "initialForeground": initial["initialForeground"],
        "restoredForeground": restored_foreground,
        "exitCode": os.waitstatus_to_exitcode(wait_status),
    }, stream)
