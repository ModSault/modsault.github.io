## Documentation / JSON Folder

This folder will contain all documentation in very direct and plain way. I'll be using JSON files mostly because they work well with javascript and websites in general. There might be other file formats for things like the structure of a file, but you'll see mostly JSON files.<br><br>

A file ending with "_names" is just a file containing the ID's of a what the filename says it is, along with the name of the ID. The reason this is its own file is because if something like a projectile wants to know what sound effect it'll make, loading the file with all information needed for each sound effect is unnecessary. So we just load the file that has all of its names.<br><br>

a file ending with "_legacy" is a file that used to have the most up to date information about the IDs described in the filenames, but isn't anymore. I can't delete the files because of how they are read by another webpage which still exists.<br><br>

Other JSON files, aka those that don't end with "_names" or "_legacy", will contain the ID of whatever the file name says along with all known information related to it. For example, projectiles will have their damage values and characters will have their movement speed.

## Committing

If you want to contribute to this these files feel free to reach out to me in any way you can to tell me what you want to add. I may also ask for a way to verify that what you are telling me is correct. As far as pull requests go, I don't plan to accept any change to a folder that isn't this one. It's not anything personal, I just don't see myself being incredible motivated to go through them, make sure the don't do anything sketchy, and accept them.