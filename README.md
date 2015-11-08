## Constellation
* A tool for exploring part of [arXiv](arxiv.org) scientific preprint database.
* I had to choose a well-connected subset of papers, and high energy physicists reference enough people that it looks good.
* The app runs very slow when too many papers are loaded, and I need to changed the d3.force() behavior and rewrite some algorithms for efficiency.
* While the arXiv API has citation data from the current paper back in time, it does not provide a way to programmatically find future articles that use the current paper as their reference.
* I had to implement a scraper and parse the limited reference data available from arXiv's partner sites. 
* The functionality of this prototype is limited and buggy, but it's fun!
* The project will probably be renamed when it's ready for production since every programmer with a similar idea already used the name Constellation.
* Best viewed stand-alone by clicking "Open in a new window"

## What About Relativity's Reach?
* I stopped development on Constellation in October 2014 and left it up on my Group's site, [admixcollective.org/constellation.html](admixcollective.org/constellation.html).
* In August 2015 [The Office for Creative Research (OCR)](http://o-c-r.org/) released [Relativity's Reach](http://www.scientificamerican.com/sciam/assets/media/multimedia/0815-relativity/index.html).
* Their awesome interactive visualization was created to commemorate the 100 year anniversary of Albert Einstein's Theory of General Relativity.
* While Constellation is dwarfed by their project in scope and depth, it does have it's charms and I will continue working on it.