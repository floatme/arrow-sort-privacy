# Keep Windows from sleeping while the generator is running.
$code = @"
using System;
using System.Runtime.InteropServices;
public static class Awake {
  [DllImport("kernel32.dll")]
  public static extern uint SetThreadExecutionState(uint esFlags);
}
"@
Add-Type -TypeDefinition $code
[void][Awake]::SetThreadExecutionState(0x80000003)
try {
  node server.js
} finally {
  [void][Awake]::SetThreadExecutionState(0x80000000)
}
