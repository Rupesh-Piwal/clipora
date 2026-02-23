# Snap-cut - High-Level Goals

## Vision

To provide a seamless, high-performance web-based recording platform that allows anyone to create and share professional PiP (Picture-in-Picture) screen captures instantly. Snap-cut aims to eliminate the friction between recording and sharing by leveraging modern browser technologies and cloud-first workflows.

## Core Features (Phase 1)

1.  **Professional PiP Recording**
    - Simultaneous capture of screen and webcam in a polished "Picture-in-Picture" layout.
    - Customizable webcam overlays with adjustable shapes (circle/square), sizes, and positions.
    - Integrated microphone and system audio capture for complete context.

2.  **High-Performance Web Rendering**
    - **Worker-Based Mixing:** Utilizes dedicated web workers and OffscreenCanvas to mix video streams at a consistent 30 FPS without impacting UI performance.
    - **Real-Time Previews:** GPU-accelerated previews ensure the creator sees exactly what is being recorded in real-time.

3.  **Instant Cloud Sharing**
    - **Direct S3 Upload:** Recordings are uploaded directly to secure cloud storage using presigned URLs, ensuring fast and reliable transfers.
    - **Metadata Enrichment:** Easily add descriptions and multiple "Related Links" to recordings, turning videos into comprehensive resource bundles.
    - **Permanent Shareable Links:** Generate unique, accessible URLs (`/v/:id`) instantly upon upload completion.

4.  **Modern Web Experience**
    - **Purely Browser-Based:** No complex software installations required; runs directly in modern browsers.
    - **Responsive Design:** Optimized for various screen sizes, ensuring a premium experience for both creators and viewers.

## Future Goals (Post-Core)

- **Advanced Scene Customization:** Dynamic background removal (AI green screen) and blur effects for webcam streams.
- **Internal Video Editor:** Browser-based trimming, cropping, and annotation tools to polish recordings before sharing.
- **AI-Powered Insights:** Automatic transcription, summary generation, and action item detection from recorded audio.
- **Team Workspaces:** Collaborative folders, shared libraries, and team-based access controls for organizations.

## Target Audience

- **Software Developers:** Sharing bug repros, feature demos, and code walkthroughs.
- **Product Managers:** Creating product updates, feature announcements, and user training.
- **Support & Success Teams:** Recording personalized "how-to" videos for customers.
- **Educators:** Preparing quick lecture snippets and student feedback.
