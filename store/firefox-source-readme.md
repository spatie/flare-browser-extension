# Flare Firefox extension source

This archive contains the source for Flare 0.1.48. The Firefox package is built with Python's standard library. No dependencies need to be installed.

From the root of this archive, run:

```sh
python3 scripts/package_firefox.py
```

The command writes `dist/flare-firefox-0.1.48.zip`. The packaging script adapts the shared Manifest V3 background declaration for Firefox and removes the development reload script. All JavaScript, CSS, and HTML remains readable. Compare the files inside the resulting ZIP with the submitted add-on package.

The build has been verified with Python 3 on macOS. It does not require macOS-specific tools and also works on Linux with Python 3.
