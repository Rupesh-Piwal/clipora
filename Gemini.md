Role: You are a senior frontend engineer with deep expertise in Web Media APIs, MediaStream rendering, and React + TypeScript.

You are working in an existing, functioning screen-recording application.
Several features (camera, mic, recording, control bar, layouts) are already working and must remain unchanged.

🚨 ABSOLUTE CONSTRAINTS (READ FIRST)

❌ DO NOT change any existing layout, UI structure, or styling

❌ DO NOT refactor components unrelated to screen sharing

❌ DO NOT break any working functionality

❌ DO NOT rename props, hooks, or state used elsewhere

❌ DO NOT alter recording logic

❌ DO NOT auto-start recording

❌ DO NOT move UI elements

Only minimal, additive changes are allowed.

🎯 Problem Statement

Clicking Screen Share correctly opens the OS picker

User selects a tab / window / screen

Screen sharing starts internally

BUT the selected screen does not appear in the preview UI

Everything else works and must stay intact.

🧠 Root Cause (For Reference)

The screen MediaStream returned by getDisplayMedia() is not attached to a <video> element via srcObject, or the attachment is lost during re-render.

✅ Allowed Scope of Changes

You may ONLY:

Attach the existing screen MediaStream to an existing or new <video> element

Add a useRef + useEffect to bind srcObject

Listen for screen-share stop events

Add cleanup logic for screen tracks

Store screen stream in state if it is currently local

No other changes are allowed.

✅ Required Implementation (Exact)
1️⃣ Preserve Existing Screen Share Trigger

Do NOT change how screen sharing is triggered.

Wherever getDisplayMedia() is already called, keep it.

2️⃣ Ensure Screen Stream Is Stored Persistently

If screen stream is currently stored in a local variable, move it to state without changing its usage elsewhere:

`const [screenStream, setScreenStream] = useState<MediaStream | null>(null)`

3️⃣ Attach Screen Stream to Video Element (CRITICAL FIX)

If a screen preview <video> already exists, reuse it.
If not, add one without affecting layout or styles.

`<video
  ref={screenVideoRef}
  autoPlay
  muted
  playsInline
/>`


Attach stream only when it exists:

`useEffect(() => {
  if (screenVideoRef.current && screenStream) {
    screenVideoRef.current.srcObject = screenStream
  }
}, [screenStream])`

4️⃣ DO NOT Render Video Before Stream Exists

Ensure the video is rendered only when screenStream !== null.

5️⃣ Handle User Stopping Screen Share

The browser may stop screen sharing externally.

You must listen for:

`screenStream?.getVideoTracks()[0]?.addEventListener('ended', () => {
  setScreenStream(null)
})`


This should:

Hide the screen preview

Leave webcam preview untouched

Not affect recording state

6️⃣ Cleanup Without Side Effects

On stopping screen sharing:

`screenStream?.getTracks().forEach(track => track.stop())`


Do NOT stop:

Camera tracks

Microphone tracks

Recording tracks