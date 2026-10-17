import json
import os
import pty
import signal
import sys

addon, node_executable, owner_entry, watcher_entry, marker_path, result_path, state_path, mode = sys.argv[1:]
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
owner_pid, master = pty.fork()
if owner_pid == 0:
    with open(initial_path, "w", encoding="utf-8") as stream:
        json.dump({"ownerPid": os.getpid(), "initialForeground": os.tcgetpgrp(0)}, stream)
    arguments = [
        node_executable, owner_entry,
        "--addon", addon,
        "--watcher", watcher_entry,
        "--state", state_path,
        "--", sys.executable, "-c", child_program, marker_path, mode,
    ]
    os.execv(node_executable, arguments)

_, wait_status = os.waitpid(owner_pid, 0)
with open(initial_path, "r", encoding="utf-8") as stream:
    initial = json.load(stream)
try:
    restored_foreground = os.tcgetpgrp(master)
except OSError:
    restored_foreground = owner_pid
with open(result_path, "w", encoding="utf-8") as stream:
    json.dump({
        "ownerPid": owner_pid,
        "initialForeground": initial["initialForeground"],
        "restoredForeground": restored_foreground,
        "exitCode": os.waitstatus_to_exitcode(wait_status),
    }, stream)
