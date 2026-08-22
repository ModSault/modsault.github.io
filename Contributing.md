# Contributing

## Overview

If you want to contribute to this project, feel free to do so. However, if you are doing so in the hopes that I will accept your pull request, I recommend reaching out to me first. I may not be happy with every proposed change, especially if it uses external libraries, so contacting me beforehand will let you know what I think before you spend time and effort making the changes.<br>

If you update or change information related to what IDs are used for or what a filename represents, I would like a way to verify that the information you provide is correct.

## Folder Structure

The home directory contains `script.js`, `style.css`, and `sw.js`. All pages use these files. The first two are used to define some global variables and generalize the appearance of the site. The last one ensures that the website refuses to load content if it does not come from this GitHub repository.<br>

Otherwise, all files for a specific tool are located in that tool's folder. This does mean that if we want to change something across multiple pages, we may need to change it multiple times, but it also means that changing one webpage does not affect the others.<br>

TThe only other folders to be aware of are `Resources` and `Documentation`. The former contains libraries and code that some webpages need and is best kept in one place. The latter contains information about IDs and filenames. If a webpage needs that information, it reads it from the `Documentation` folder.

## Why Vanilla HTML, CSS, and JS?

Let's start by explaining why I made a website in the first place.
 - GUIs are easy to create in browsers.
 - Support for Windows, macOS, and Linux is pretty much guaranteed.
 - Features such as colorblind support, plugins, translators, and more are already built in.
 - Users do not need to download files to their computers.

What this all comes down to is convenience. Web browsers are not particularly fast or efficient when it comes to using small amounts of RAM, but they certainly simplify the development process.

When I started this website, I was not familiar with tools like React at all. While that is still partially true, there are other reasons why I do not use tools like React. I do not like having dependencies that I do not fully understand or that could break after an update. I also do not want a larger or laggier website for what I consider a simple enough task to accomplish with vanilla HTML, CSS, and JavaScript. I also like how simple it is to start a local development server with one python command (something most programmers already have installed).

Ultimately, what this comes down to is that React is somewhat of a giant black box to me thats harder to use. For this project, it would increase the final file size of webpages and potentially make the website slower without providing enough benefit to justify it. I can see why React is important for more complex applications, but I do not think any of these web pages need it.