# Extension development

The installed file watcher publishes saves in `extension/` by bumping the manifest version. After a change, verify the version increased and the open Laravel Cloud page refreshed with the new extension. If it does not, check that `python3 scripts/watch_extension.py install` has installed the watcher, Chrome Developer mode is on, and the installed Flare extension points to this `extension/` directory.
