# Star Fox Assault Modding Site

This [website](https://modsault.github.io/) is meant to provide a place for easily modifying and viewing information specifically related to Star Fox Assault. It is still a massive work in progress, so certain tools and information are not available yet.<br>

For more information about which tools currently exist, I recommend visiting the site's [home page](https://modsault.github.io/).

## The `Documentation/*.json` files

This folder is meant to contain documentation about various aspects of the game, such as IDs and files, in a direct and easy-to-understand format. I'll mostly be using JSON files because they work well with JavaScript and websites in general.<br>

Doing it this way allows others to either copy only this folder or use fetch commands to retrieve its contents without needing to interact with other parts of the site. If you use the fetch method, you can be sure that the information will update automatically.<br>

A file ending with `_names` contains the IDs of whatever the filename describes, along with the corresponding names for those IDs. The reason this information is stored in its own file is that, for example, if something like a projectile needs to know which sound effect it will make, loading a file containing all of the information for every sound effect would be unnecessary. Instead, it can simply load the file containing only their names.<br>

A file ending with `_legacy` contains what was previously the most up-to-date information about the IDs described by the filename, but is no longer current. I cannot delete these files because another webpage that still exists reads them. The reason these files currently exist is that, shortly after creating the projectile information webpage, I learned that additional information, such as speed and distance, was located right next to the damage values. At some point, I plan to create another tool to modify all of that information, but for now, that tool does not exist.<br>

Other JSON files, aka those that don't end with `_names` or `_legacy`, contain the IDs described by their filenames, along with all known information related to them. For example, projectile files contain damage values, while character files contain information such as movement speed.

## Contributing

Read `Contributing.md`. If you're viewing this on GitHub, there should be a tab for it above the text container.

## ModSault

ModSault is the primary modder behind this site. Check out his other socials here:

- Youtube: https://www.youtube.com/@modsault6330
- Twitch: https://www.twitch.tv/modsault
- Reddit: https://www.reddit.com/user/ModSault/