# Bilibili Cookie Handling

Bilibili subtitle extraction may need a logged-in browser cookie when public subtitles are unavailable or rate limited. Keep that cookie file private and outside this plugin repository, the generated Codex plugin repository, and any installed plugin cache.

Recommended practice:

- Export a Netscape-format cookie file from your own browser only when the target video requires login state.
- Store it in a private local directory, such as a user profile configuration folder or a task-specific temporary directory.
- Pass it explicitly with `--cookie "<private-cookie-file>"`.
- Delete or refresh the file after the task if it is no longer needed.

Do not place browser cookie files under `skills/amagi-video-analysis/`. The converter and validator intentionally reject cookie text files in bundled plugin paths.
