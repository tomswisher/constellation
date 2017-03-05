(Backup of my gist hosted on bl.ocks.org/tomswisher)

## Constellation
* Best viewed stand-alone by clicking "Open in a new window"
* A tool for exploring part of [arXiv](http://arxiv.org) scientific preprint database.
* I had to choose a well-connected subset of papers, and high energy physicists reference enough people that it looks good.
* The app runs very slow when too many papers are loaded, and I need to changed the d3.force() behavior and rewrite some algorithms for efficiency.
* While the [arXiv API](http://arxiv.org/help/api/index) has citation data from the current paper going back in time, it does not provide a way to programmatically find future articles that use the current paper as their reference.
* I had to implement a scraper and parse the limited reference data available from arXiv's partner sites, which only load while on the arXiv website.
* The functionality of this prototype is limited and buggy, but it's fun!
* The project will probably be renamed when it's ready for production since every programmer with a similar idea already used the name Constellation.
