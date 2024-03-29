// 2014 Tom Swisher

'use strict';

var g = InitializeG();
UpdateDurations();

// ----------------------------------------------------------------------------
// Variable and D3 function declarations
// ----------------------------------------------------------------------------
var nodes;
var links;
var namehashlookup = {};
var showXAxis = false;
var showYAxis = true;

// Force Directed Graph
var force = d3.layout.force()
	.linkDistance(g['linkDistance'])
	.linkStrength(g['linkStrength'])
	.friction(g['friction'])
	.charge(g['charge'])
	.chargeDistance(g['chargeDistance'])
	.theta(g['theta'])
	.gravity(g['gravity'])
	.size([g['stagewidth'], g['stageheight']])
	.on('tick', Tick);

// SCALES
var scales = {};

var MonthString = d3.scale.ordinal()
	.domain(d3.range(1,13))
	.range(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']);

var Radius = d3.scale.linear()
	.domain([ 0, 1 ])
	.range([ 0, g['node_r']	]);

var viewoptions = [
	{option:'time',        display:String('Date Published')}, 
	{option:'title',       display:String('Paper Title')}, 
	{option:'citedby',     display:String('# Times Cited')}, 
	{option:'referencing', display:String('# References')}, 
	{option:'name',        display:String('arXiv ID')}, 
	{option:'index',       display:String('Loading Order')}
];

var menuoptions = [
	{option:'time',       helptext:'Expand the time plane (blocking newer papers)'},
	{option:'references', helptext:'Load the references for the selected paper'},
	// {option:'hide',       helptext:'Hide the paper and its associated links'},
	{option:'citing',     helptext:'Load the papers citing the selected paper'}
];

(function(){
	for (var i=0; i<menuoptions.length; i++) {
		menuoptions[i].startAngle_min  = 2*Math.PI*(g['angleinitial']+g['angle'+menuoptions[i].option]+0);
		menuoptions[i].endAngle_min    = 2*Math.PI*(g['angleinitial']+g['angle'+menuoptions[i].option]+0+g['anglewidth']);
		menuoptions[i].startAngle_max  = 2*Math.PI*(g['angleinitial']+g['angle'+menuoptions[i].option]+1);
		menuoptions[i].endAngle_max    = 2*Math.PI*(g['angleinitial']+g['angle'+menuoptions[i].option]+1+g['anglewidth']);
		menuoptions[i].innerRadius_max = Radius(1); 
		menuoptions[i].outerRadius_max = Radius(4.33)-1;
		menuoptions[i].innerRadius_min = Radius(1);
		menuoptions[i].outerRadius_min = Radius(1);
	}
})();

// ----------------------------------------------------------------------------
// Building the DOM
// ----------------------------------------------------------------------------

var body = d3.select('body')
	.on('keydown', function() {
		if (d3.event.shiftKey) { g['shiftKey'] = true; }
	})
	.on('keyup', function() {
		if (d3.event.keyIdentifier==='Shift') {	g['shiftKey'] = false; }
	});

var svg = body.append('svg')
	.attr('width', g['stagewidth'] + g['sidesleft'] + g['sidesright'])
	.attr('height', g['stageheight'] + g['sidestop'] + g['sidesbottom'] - ((showXAxis===false)?g['axessize']:0));

svg.append('svg:clipPath').attr('id', 'stageclipPath')
	.append('rect')
		.attr('x', 0)
		.attr('y', 0)
		.attr('width', g['stagewidth'])
		.attr('height', g['stageheight']);

var examinerdivroot = body.append('div')
	.attr('id', 'examiner-container')
	.style('pointer-events', 'none')
	.style('position', 'absolute')
	.style('left', (g['sidesleft']+g['SVGoffsetLeft'])+'px')
	.style('top', (g['sidestop']+g['SVGoffsetTop'])+'px')
	.style('width', g['stagewidth']+'px')
	.style('height', g['stageheight']+'px')
	.style('overflow', 'hidden');

// STAGE
var stage = svg.append('g')
	.on('mousedown', function() {
		g['mousedown'] = true;
	})
	.on('mouseup', function() {
		g['mousedown'] = false;
	})
	.on('mouseout', function() {
		g['mousedown'] = false;
	})
	.attr('clip-path', 'url(#stageclipPath)')
	.attr('transform', 'translate('+g['sidesleft']+','+g['sidestop']+')');

// stage.append('rect')
// 	.classed('understagebg', true)
// 	.attr('x', 0)
// 	.attr('y', 0)
// 	.attr('width', (1)*g['stagewidth'])
// 	.attr('height', (1)*g['stageheight']);

stage.append('rect')
	.classed('stagebg', true)
	.attr('x', 0)
	.attr('y', 0)
	.attr('width', (1)*g['stagewidth'])
	.attr('height', (1)*g['stageheight'])
	.on('mouseover', function() {
		ClearHelpText();
		d3.select('#examiner-container').transition().duration(g['duration']).ease('cubic-out').style('opacity', 0);
	})
	.call(d3.behavior.drag()
		.on('drag', function() { DragStage(d3.event.dx, d3.event.dy); })
	);

stage = stage
	.append('g').classed('stagerootx', true)
	.append('g').classed('stagerooty', true);

var sides = svg.append('g')
	.attr('id', 'sides-container')
	.attr('transform', 'translate('+g['sidesleft']+','+g['sidestop']+')');

sides.append('rect')
	.classed('sidesbg', true)
	.attr('x', -g['sidesleft'])
	.attr('y', -g['sidestop'])
	.attr('width', g['sidesleft'])
	.attr('height', g['svgheight'])
	.on('mouseover', ClearHelpText);

// AXES BARS
if (showYAxis === true) {
	sides.append('rect')
		.classed('axesbars Y', true)
		.attr('x', -g['axessize'])
		.attr('y', 0)
		.attr('width', g['axessize'])
		.attr('height', g['stageheight'])
		.on('mouseover', function() {
			UpdateHelpText('Scroll the mousewheel or pinch the screen to zoom the Y Axis');
		})
		.call(d3.behavior.drag()
			.on('drag', function() { DragStage(d3.event.dx, d3.event.dy); })
		)
		.each(function() {
			if (g['browserisChrome']===true || g['browserisSafari']===true) {
				d3.select(this)
					.on('mousewheel', function() { MouseWheel('Y', d3.event); });
			}
			else if (g['browserisFirefox']===true) {
				d3.select(this)
					.on('wheel', function() { MouseWheel('Y', d3.event); });
			}
	});
}
if (showXAxis === true) {
	sides.append('rect')
		.classed('axesbars X', true)
		.attr('x', 0)
		.attr('y', g['stageheight'])
		.attr('width', g['stagewidth'])
		.attr('height', g['axessize'])
		.on('mouseover', function() {
			UpdateHelpText('Scroll the mousewheel or pinch the screen to zoom the X Axis');
		})
		.call(d3.behavior.drag()
			.on('drag', function() { DragStage(d3.event.dx, d3.event.dy); })
		)
		.each(function() {
			if (g['browserisChrome']===true || g['browserisSafari']===true) {
				d3.select(this)
					.on('mousewheel', function() { MouseWheel('X', d3.event); });
			}
			else if (g['browserisFirefox']===true) {
				d3.select(this)
					.on('wheel', function() { MouseWheel('X', d3.event); });
			}
	});
}

var LayoutX = d3.scale.linear()
	.domain([ -0.5+0, -0.5+g['wnum']-1 ])
	.range([
		 (-1)*g['sidesleft'] + (1/2)*g['unitsquare'], 
		 (-1)*g['sidesleft'] + (1/2)*g['unitsquare'] + (g['wnum']-1)*g['unitsquare']
	]);
var LayoutY = d3.scale.linear()
	.domain([ 0, g['hnum']-1 ])
	.range([
		(-1)*g['sidestop'] + (1/2)*g['unitsquare'] + (g['hnum']-1)*g['unitsquare'],
		(-1)*g['sidestop'] + (1/2)*g['unitsquare']	 
	]);

var axes = {};
for (var i=0; i<viewoptions.length; i++) {
	axes[viewoptions[i]['option']] = {};
	if (showYAxis === true) {
		axes[viewoptions[i]['option']]['Y'] = BuildAxis('Y');
	}
	if (showXAxis === true) {
		axes[viewoptions[i]['option']]['X'] = BuildAxis('X');
	}
}

var buttons = BuildButtonCollection();

// ARXIV
var arxivg = sides.append('g')
	.attr('transform', 'translate('+(0.125*g['unitsquare'])+','+LayoutY(g['hnum']-0.75)+')')
	.append('g')
		.attr('transform', 'scale(1,1)');
var arxivtext = arxivg.append('svg:a')
	.attr('opacity', 1)
	.on('mouseover', function() { UpdateHelpText('Click to open arXiv paper in new tab'); })
	.datum( {name:'', year:0} )
	.attr('target', '_blank') // open in a new tab/window
	.attr('xlink:href', 'http://www.arxiv.org');
arxivtext.append('text')
	.classed('selected arxivtext', true)
	.attr('x', 0)
	.attr('y', 0)
	.text('');	

// HELP
var helpg = sides.append('g')
	.attr('transform', 'translate('+(0.125*g['unitsquare'])+','+LayoutY(0.75)+')')
	.append('g')
		.attr('transform', 'scale(1,1)');
var helptext = helpg.append('svg:a');
helptext.append('text')
	.classed('helptext', true)
	.attr('x', 0)
	.attr('y', 0);
ClearHelpText();

var viewmenus = {};
var viewmenuContainer = body.append('div').attr('id', 'viewmenu-container');
if (showYAxis === true) {
	viewmenus['Y'] = BuildViewMenu('Y');
}
if (showXAxis === true) {
	viewmenus['X'] = BuildViewMenu('X');
}

BuildAdditionalText();

// ----------------------------------------
// DEBUG
g['debuglayout']       = false;
g['debugforce']        = true;
g['debuganimation']    = false;

var forcedebugdivs = []; // Should exist in case of Unit Tests
if (g['debugforce']===true) {
	DebugForce();
}
if (g['debuglayout']===true) {
	DebugLayout();
}
// ----------------------------------------

var vampclock, transitionvampclock, vamprect;
DrawLoadingScreen();
DebugAnimation(); // always necessary to create the vampclock
body.style('cursor', 'wait');
svg.style('pointer-events', 'none');

window.onload = InitializePage;

// ----------------------------------------------------------------------------
// Function declarations
// ----------------------------------------------------------------------------

function DrawLoadingScreen() {
	sides.append('g')
		.classed('loading', true)
		.append('text')
		.classed('loadingtext', true)
		.attr('x', g['stagewidth']*0.75)
		.attr('y', LayoutY(2))
		.text('Loading...');
}

function RemoveLoadingScreen() {
	d3.selectAll('.loading').transition()
		.ease(g['easeflipin'])
		.duration(g['duration'])
		.style('opacity', 0)
		.call(EndAll, function() {
			d3.selectAll('.loading').remove();
		});
}

function InitializePage() {
	d3.json('arxivgraph.json', function(error, json) {
		g['json'] = json;
		// ConY the original 'name' references to the D3 node indices
		g['json'].nodes.forEach(function(d) {
			namehashlookup[d.name] = d;
		});
		// YEARLABELS
		g['yearmin'] = d3.min(g['json'].nodes, function(d) { return d.year; });
		g['yearmax'] = d3.max(g['json'].nodes, function(d) { return d.year; });
		InitializeScales();
		if (showYAxis === true) {
			GenerateScales('Y');
		}
		if (showXAxis === true) {
			GenerateScales('X');
		}
		// Generate links that references the new nodes
		g['json'].links.forEach(function(d) {
			d.source = namehashlookup[d.source];
			d.target = namehashlookup[d.target];
		});
		// Proton Stability in Six Dimensions
		var id0 = 'hep-ph/0107056';
		// Add the first node
		var firstnode = namehashlookup[id0];
		firstnode.visible = true;
		force.nodes().push(firstnode);
		// var secondnode = namehashlookup[id1];
		// secondnode.visible = true;
		// force.nodes().push(secondnode);

		Refresh();

		// CollapseOptionPiece(nodes[0][0], 'citing');
		var node_this = nodes[0][0];

		// Loading Animation
		TransitionVamp(g['durationOpening']).each('end', function() {
			SelectNode(node_this);
			ToggleMenu(node_this);
			TransitionVamp(g['duration']).each('end', function() {
				d3.select(node_this).datum().fixed = true;
				LoadReferences(node_this);
				TransitionVamp(g['duration']).each('end', function() {
					g['vampOverride'] = true;
					d3.selectAll('.buttonsYincr').on('mousedown')();
					g['vampOverride'] = false;
					TransitionVamp(g['durationtranslate']).each('end', function() {
						g['vampOverride'] = true;
						d3.selectAll('.buttonsYfree').on('mousedown')();
						g['vampOverride'] = false;
						TransitionVamp(g['durationtranslate']).each('end', function() {
							ToggleMenu(node_this);
							TransitionVamp(g['duration']).each('end', function() {
								g['vamptime'] = 0;
								Vamp(1); // Initialize vamp timer
								console.log('Ready');
								RemoveLoadingScreen();
								force.start();
							});
						});
					});
				});
			});
		});
	});
}

function Refresh() {
	// ENTER NODES
	nodes = stage.selectAll('.nodes')
		.data(force.nodes(), function(d) { 
			return d.name;
		});
	var nodesenterg = nodes.enter()
		.append('g')
			.each(function(d) {
				d.newx = d.x;
				d.newy = d.y;
				d.stayfixed = false;
				d.planeout = false;
				d.menuout = false;
				d.fixed = false;
				d.referencesout = false;
				d.noreferences = false;
				d.citingout = false;
				d.nociting = false;
			})
			.classed('allforceelements', true)
			.classed('nodes', true)
			.call(force.drag);
	// NODE CIRCLES
	nodesenterg.append('circle')
		.classed('nodecircles', true)
		.classed('notselected', true)
		// .call(NodeCircleStyle)
		.on('mouseover', function(d) {
			if (g['shiftKey']===false) {
				d3.select('#examiner-container').interrupt().style('opacity', 1);
			// if (g['shiftKey']!==false) {
				ClearHelpText();
				if (g['node_this']!==this.parentNode && g['mousedown']===false) {
					SelectNode(this.parentNode);
				}
			}
		})
		.on('click', function() {
			if (g['vamptime']===0 && g['shiftKey']===false) {
				if (g['node_this']!==this.parentNode) {
					SelectNode(this.parentNode);
				}
				if (d3.event.defaultPrevented===false) {
					nodes.filter(function(d) { return d.menuout===true; })
						.each(function() { ToggleMenu(this); });
					ToggleMenu(this.parentNode);
				}
			}
		})
		.attr('cx', 0)
		.attr('cy', 0)
		.attr('r', g['node_r'])
		.attr('opacity', 0)
			.transition()
				.ease(g['easenodein'])
				.duration(g['durationnode'])
				// .delay(g['durationlink'])
				.attr('opacity', 1);

	var newnodearray = [], i, j, new_datum;
	for (i=0; i<nodesenterg[0].length; i++) {
		if (nodesenterg[0][i]!==null) {
			newnodearray.push(nodesenterg[0][i]);
		}
	}
	for (i=0; i<newnodearray.length; i++) {
		for (j=0; j<menuoptions.length; j++) {
			// copy the datum by value, not by reference
			new_datum = $.extend({}, d3.select(newnodearray[i]).datum());
			// each arc gets an independent datum
			d3.select(newnodearray[i]).insert('svg:path', 'circle')
				.datum(new_datum)
				.each(function(d) {
					for (var key in menuoptions[j]) {
						d[key] = menuoptions[j][key];
					}
				})
				.attr('class', function(d) { return d.option; })
				.classed('menus', true)
				.classed('arcs', true)
				.call(SetArcAttrFromData, 'current', 'min')
				.call(SetArcDataFromAttr, 'current', 'current')
				.call(SetArcDataFromData, 'oldmax', 'max')
				.on('mouseover', function(d) {
					var node_this = this.parentNode;
					var node_d = d3.select(node_this).datum();
					d3.select('#examiner-container').interrupt().style('opacity', 1);
					if (g['node_this']!==this.parentNode && g['mousedown']===false) {
						SelectNode(this.parentNode);
					}
					if (d.option==='time') {
						if (node_d.planeout===true) {
							UpdateHelpText('Collapse the time plane');
						}
						else {
							UpdateHelpText('Expand the time plane (blocking newer papers)');
						}
					}
					if (d.option==='references') {
						if (node_d.referencesout || node_d.noreferences) {
							UpdateHelpText('References are already loaded for this paper');
						}
						else {
							UpdateHelpText('Load the references for this paper');
						}
					}
					if (d.option==='citing') {
						if (node_d.citingout || node_d.nociting) {
							UpdateHelpText('Citing papers are already loaded for this paper');
						}
						else {
							UpdateHelpText('Load the papers citing this paper');
						}
					}
				})
				.on('click', function(d) {
					var node_this = this.parentNode;
					var node_d = d3.select(node_this).datum();
					if (g['vamptime']===0 && g['shiftKey']===false) {
						if (d3.event.defaultPrevented===true) {
							// Nothing
						}
						else {
							if (d.option==='time') {
								if (node_d.planeout===true) {
									// Nothing
								}
								else {
									UpdateHelpText('Collapse the time plane');
								}
								TogglePlane(node_this);
							}
							if (d.option==='references' && node_d.referencesout !== true && node_d.noreferences !== true) {
								LoadReferences(node_this);
								ClearHelpText();
							}
							if (d.option==='citing' && node_d.citingout !== true && node_d.nociting !== true) {
								LoadCiting(node_this);
								ClearHelpText();
							}
						}
					}
				});
		}
	}
	nodes.exit().remove();
	// LINKS
	links = stage.selectAll('.links')
		.data(force.links(), function(d) {
			return d.source.name + '-' + d.target.name;
		});
	var linksenterg = links.enter()
		.append('g')
			.classed('allforceelements', true)
			.classed('links', true);
	linksenterg
		.append('line')
			.classed('linklines', true)
			// .classed('time', true)
			// .classed('source', false)
			// .classed('citations', false)
			// .classed('selected', false)
			.style('opacity', 0)
			.transition()
				.ease(g['easelinkin'])
				.duration(g['durationlink'])
				.style('opacity', 1);
	// LINKCOVERS
		linksenterg
			.append('circle')
				.call(GetClassesForLinkcover)
				.style('pointer-events', 'none')
				.attr('cx', function(d) {
					return d.source.x;
				})
				.attr('cy', function(d) {
					return d.source.y;
				})
				.attr('r', g['node_r'])
				.attr('opacity', 0)
				.transition()
					.ease(g['easenodein'])
					.duration(g['durationnode'])
					// .delay(g['durationlink'])
					.attr('opacity', 1)
					.each('end', function(d) {
						// Only keep the newest (highest time) linkcover
						// var currenttime = d.source.time;
						// var currentname = d.source.name;
						// linkcoverarray = d3.selectAll('.linkcovers')
						// 	.filter(function(d) {
						// 		return d.source.name===currentname;
						// 	})
						// 	.filter(function(d) {
						// 		return d.source.time < currenttime;
						// 	})
						// 	.remove();
					});
	// links.exit().remove();
	links.each(function(d) {
		d.time = d.source.time + (-0.01)/365;
	});
	Sorttimes();
	// Make sure styling is correct for new links
	if (g['node_this']!==false) {
		UpdateLinksClass('references', false);
		UpdateLinksClass('citing', false);
		UpdateAdjacentElementsClass(g['node_this'], 'references', true);
		UpdateAdjacentElementsClass(g['node_this'], 'citing', true);
	}
	force.start();
}

function RandomInclusive() {
	if(Math.random()===0) { return 1; }
	else { return Math.random(); }
}

function UpdateHelpText(newtext) {
	helptext.select('text')
		.text(newtext);
}

function ClearHelpText() {
	helptext.select('text')
		// .text('( Help text )');
		.text('Mouse+Shift to drag papers without selecting / References are dark gray / Citing papers are silver');
}

function BuildAxis(XorY) {
	var newaxis = sides
		.append('g')
			.attr('pointer-events', 'none')
			.attr('transform', 'translate('+0+','+g['stageheight']+')')
		.append('g');
	if (XorY==='Y') {
		// side
		newaxis.append('rect').classed('axisbar', true)
			.attr('x', (-1)*g['axesbarsize'])
			.attr('y', (-1)*g['stageheight'])
			.attr('width', g['axesbarsize'])
			.attr('height', g['stageheight']);
		// base
		newaxis.append('rect').classed('axisbar', true)
			.attr('x', (-1)*g['axessize'])
			.attr('y', (0)*g['axesbarsize'])
			.attr('width', g['axessize'])
			.attr('height', g['axesbarsize']);
		// Keep labels and ticks within the axis
		newaxis.append('svg:clipPath').attr('id', XorY+'clipPath')
			.append('rect')
				.attr('x', (-1)*g['axessize'])
				.attr('y', (-1)*g['stageheight'])
				.attr('width', g['axessize'] + g['stagewidth'])
				.attr('height', g['stageheight']+g['axesbarsize']);
		newaxis.attr('transform', 'scale(0,0)');
	}
	if (XorY==='X') {
		// side
		newaxis.append('rect').classed('axisbar', true)
			.attr('x', (0)*g['stageheight'])
			.attr('y', (0)*g['axesbarsize'])
			.attr('width', g['stagewidth'])
			.attr('height', g['axesbarsize']);
		// base
		newaxis.append('rect').classed('axisbar', true)
			.attr('x', -g['axesbarsize'])
			.attr('y', 0)
			.attr('width', g['axesbarsize'])
			.attr('height', g['axessize']);
		// Keep labels and ticks within the axis
		newaxis.append('svg:clipPath').attr('id', XorY+'clipPath')
			.append('rect')
				.attr('x', -g['axesbarsize'])
				.attr('y', -g['stageheight'])
				.attr('width', g['stagewidth']+g['axesbarsize'])
				.attr('height', g['axessize'] + g['stageheight']);
		newaxis.attr('transform', 'scale(0,0)');
	}
	newaxis
		.attr('clip-path', 'url(#'+XorY+'clipPath)')
		.append('g')
			.classed(XorY+'rootx', true)
		.append('g')
			.classed(XorY+'rooty', true);
	return newaxis;
}

function BuildScale(scalename, domainmin, domainmax, XorY, view) {
	var tempstagespan, temprangemin, temprangemax, newscale;
	if (XorY==='X') {
		tempstagespan = g['stagewidth']*g['Xzoom'];
	}
	if (XorY==='Y') {
		tempstagespan = g['stageheight']*g['Yzoom'];
	}
	if (view==='incr') {
		temprangemin = Radius(4.33);
		temprangemax = tempstagespan-Radius(4.33);
	}
	if (view==='decr') {
		temprangemin = tempstagespan-Radius(4.33);
		temprangemax = Radius(4.33);
	}
	if (scalename==='alphabet') {
		newscale = d3.scale.ordinal()
			.domain(g['alphabetarray'])
			.rangeBands([ temprangemin, temprangemax ]); 
		return newscale;
	}
	if (typeof(domainmin)==='number') {
		newscale = d3.scale.linear()
			.domain([ domainmin, domainmax ])
			.range([ temprangemin, temprangemax ]);
		return newscale;
	}
	if (typeof(domainmin)==='string') {
		return function(passedstring) {
			var templetter = passedstring[0].toUpperCase();
			if (g['alphabetarray'].indexOf(templetter)===-1) {
				templetter = 'Z';
			}
			return scales['alphabet'][XorY][view](templetter);
		};
	}	
}

function BuildScaleCollection(scalename, domainmin, domainmax, XorY) {
	var newscaleobject = {'incr':{}, 'decr':{}};
	newscaleobject['incr'] = BuildScale(scalename, domainmin, domainmax, XorY, 'incr');
	newscaleobject['decr'] = BuildScale(scalename, domainmin, domainmax, XorY, 'decr');
	return newscaleobject;
}

function Vamp(durationvamp) {
	// only update vamptime if necessary
	if (durationvamp > g['vamptime']) {
		g['vamptime'] = durationvamp;
		body.style('cursor', 'wait');
		svg.style('pointer-events', 'none');
		if (showYAxis === true) {
			viewmenus['Y'][0][0].disabled = true;
		}
		if (showXAxis === true) {
			viewmenus['X'][0][0].disabled = true;
		}
		d3.select('.vamprect').attr('fill', 'red');
		vampclock.interrupt();
		vampclock
			.text(parseFloat(g['vamptime']).toFixed(0))
			.transition()
				.ease('linear')
				.duration(g['vamptime'])
				.tween('text', function(d) {
					var interpolate = d3.interpolate(g['vamptime'], 0);
					return function(t) {
						this.textContent = parseFloat(interpolate(t)).toFixed(0);
					};
				})
				.each('end', function() {
					if (showYAxis === true) {
						viewmenus['Y'][0][0].disabled = false;
					}
					if (showXAxis === true) {
						viewmenus['X'][0][0].disabled = false;
					}
					d3.select('.vamprect').attr('fill', 'green');
					g['vamptime'] = 0;
					body.style('cursor', 'default');
					svg.style('pointer-events', 'inherit');
				});
	}
}

function TransitionVamp(durationvamp) {
	// if (g['vamptime']===0) {
		Vamp(durationvamp);
	// }
	var transition = transitionvampclock
		.attr('clock', durationvamp)
		.text(durationvamp)
		.transition()
			.ease('linear')
			.duration(durationvamp)
			.attr('clock', 0)
			.text(0);
	return transition;
}

function InitializeScales() {
	scales['alphabet'] = {'X':{}, 'Y':{}};
	for (var i=0; i<viewoptions.length; i++) {
		scales[viewoptions[i]['option']] = {'X':{}, 'Y':{}};
	}
}

function GenerateScales(XorY) {
	var i, j, tempmin, tempmax, year, ref, cit, index;
	scales['alphabet'][XorY] = BuildScaleCollection('alphabet', 'A', 'B', XorY);
	for (year=1991; year<=2014; year++) {
		BuildAxesObject('axeslabels', 'time', year, XorY);
	}
	for (ref=0; ref<=100; ref++) {
		BuildAxesObject('axeslabels', 'referencing', ref, XorY);
	}
	for (cit=0; cit<=100; cit++) {
		BuildAxesObject('axeslabels', 'citedby', cit, XorY);
	}
	for (index=0; index<=200; index++) {
		BuildAxesObject('axeslabels', 'index', index, XorY);
		BuildAxesObject('axesgridlines', 'index', index-0.5, XorY);
	}
	for (i=0; i<viewoptions.length; i++) {
		switch (viewoptions[i]['option']) {
			case 'index':
				tempmin = 0;
				tempmax = 25;
				break;
			case 'time':
				tempmin = 1991;
				tempmax = 2002;
				break;
			case 'referencing':
				tempmin = 0;
				tempmax = 30;
				break;
			case 'citedby':
				tempmin = 0;
				tempmax = 30;
				break;
			default:
				tempmin = d3.min(g['json'].nodes, function(d) { return d[viewoptions[i]['option']]; });
				tempmax = d3.max(g['json'].nodes, function(d) { return d[viewoptions[i]['option']]; });
				break;
		}
		scales[viewoptions[i]['option']][XorY] = BuildScaleCollection(
			viewoptions[i]['option'], tempmin, tempmax, XorY
		);
		if (viewoptions[i]['option']==='time' || viewoptions[i]['option']==='index' || viewoptions[i]['option']==='referencing'	|| viewoptions[i]['option']==='citedby') {
			// nothing
		}
		else if (typeof(tempmin)==='string') {
			for (j=0; j<g['alphabetarray'].length; j++) {
				BuildAxesObject('axeslabels', viewoptions[i]['option'], g['alphabetarray'][j], XorY);
			}
		}
		else {
			for (j=tempmin; j<=tempmax; j++) {
				BuildAxesObject('axeslabels', viewoptions[i]['option'], j, XorY);
			}
		}
	}
}

function BuildViewMenu(XorY) {
	// DROPDOWN
	var newmenu, tempwidth, templeft, temptop, temptransform, tempwebkittransformorigin, temptext;
	templeft = g['sidesleft']+LayoutX(-0.65);
	tempwidth = (3)*g['unitsquare'];
	if (XorY==='Y') {
		temptop = (1)*g['sidestop']+LayoutY(g['hnum']-7.6);
	}
	if (XorY==='X') {
		temptop = (1)*g['sidestop']+LayoutY(g['hnum']-10.1);
	}
	newmenu = viewmenuContainer
		.append('select')
			.classed('viewmenu', true)
			.style('height', g['font-size'] + 2*g['iconpad'] + 'px')
			.style('left', templeft + 'px')
			.style('top', temptop + 'px')
			.style('width', tempwidth + 'px');
	for (var i=0; i<viewoptions.length; i++) {
		newmenu
			.append('option')
				.classed(XorY+'dropoption', true)
				.classed(viewoptions[i]['option'], true)
				.attr('value', viewoptions[i]['option'])
				.text(viewoptions[i]['display']);
	}
	newmenu
		.on('mouseover', function() {
			UpdateHelpText('Change the perspective of the '+XorY+' Axis');
		})
		.on('change', function() {
			if (g['vamptime']===0) {
				UpdateDropDown(XorY, this.value, 'alreadychanged');
			}
		});
	return newmenu;
}

function UpdateDropDown(XorY, view, changed) {
	g[XorY+'viewold'] = g[XorY+'viewnew'];
	g[XorY+'viewnew'] = view;
	ApplyViewOption(g[XorY+'viewnew'], XorY);
	if (g[XorY+'sortnew']!=='free') {
		TransformView(XorY, 'viewchange');
	}
	if (changed!=='alreadychanged') {
		//~
		d3.selectAll('.'+XorY+'dropoption').attr('selected', false);
		d3.select('.'+XorY+'dropoption.'+view).attr('selected', true);
	}
}

function ApplyViewOption(viewoption, XorY) {
	var temptransform1, temptransform2, i;
	if (g[XorY+'sortnew']!=='free') {
		Vamp(g['durationtranslate']);
	}
	force.stop();
	if (XorY==='Y') {
		temptransform1 = 'scale(1,0)';
		temptransform2 = 'scale(0,1)';
	}
	else if (XorY==='X') {
		temptransform1 = 'scale(0,1)';
		temptransform2 = 'scale(1,0)';
	}
	if (g[XorY+'isout']===false) {
		for (i=0; i<viewoptions.length; i++) {
			axes[viewoptions[i]['option']][XorY].attr('transform', 'scale(0,0)');
		}
		axes[viewoption][XorY].attr('transform', temptransform1);
	}
	else {
		for (i=0; i<viewoptions.length; i++) {
			if (viewoptions[i]['option']!==viewoption) {
				axes[viewoptions[i]['option']][XorY]
					.transition()
						.ease(g['easeaxesin'])
						.duration(g['duration'])
						.attr('transform', temptransform2);
			}
		}
		axes[viewoption][XorY]
			.attr('transform', temptransform2)
				.transition()
					.ease(g['easeaxesout'])
					.duration(g['duration'])
					.delay(g['durationtranslate']-g['duration'])
					.attr('transform', 'scale(1,1)');
	}
}

function RandomizeForceParameters() {
	var forcepropertyarray = [
		'linkDistance',
		'linkStrength',
		'friction',
		'charge',
		'chargeDistance',
		'theta',
		'gravity'
	];
	var min, max, randomvalue, property, divindex, value;
	d3.selectAll('.forcedebugslider')
		.each(function() {
			property = d3.select(this).attr('property');
			// property is a force attribute
			if (forcepropertyarray.indexOf(property) !== -1) {
				divindex = d3.select(this).attr('divindex');
				min = d3.select(this).attr('min');
				max = d3.select(this).attr('max');
				randomvalue = parseFloat(min) + RandomInclusive()*(max-min);
				randomvalue = randomvalue.toFixed(1);
				d3.select(this).attr('value', randomvalue);
				UpdateSliders(divindex, property, randomvalue);
			}	
		});
}

function BuildDebugSlider(divindex, property, property_min, property_max) {
	var width1 = (2/16)*g['stagewidth'];
	var width2 = (2/16)*g['stagewidth'];
	var width3 = (1/16)*g['stagewidth'];
	var width4 = (4/16)*g['stagewidth'];
	var width5 = (1/16)*g['stagewidth'];

	forcedebugdivs[divindex].append('label')
		.classed('forcedebuglabel', true)
		.style('width', width1+'px')
		.text(property);
	
	forcedebugdivs[divindex].append('label')
		.classed('forcedebuglabel', true)
		.classed(property+'_readout', true)
		.style('width', width2+'px')
		// .text('( '+g[property]+' )');
		.text(g[property]);
	
	forcedebugdivs[divindex].append('label')
		.classed('forcedebuglabel', true)
		.style('width', width3+'px')
		.text(property_min);
	
	forcedebugdivs[divindex].append('input')
		.classed('forcedebugslider', true)
		.style('width', width4+'px')
		.attr('type', 'range')
		.attr('property', property)
		.attr('divindex', divindex)
		.attr('min', property_min)
		.attr('max', property_max)
		.attr('step', (property_max - property_min)/100)
		.attr('value', g[property])
		.on('change', function() {
			UpdateSliders(divindex, property, this.value);
		});
	
	forcedebugdivs[divindex].append('label')
		.classed('forcedebuglabel', true)
		.style('width', width5+'px')
		.text(property_max);
	
	return forcedebugdivs[divindex];
}

function UpdateSliders(divindex, property, value) {
	forcedebugdivs[divindex].select('.'+property+'_readout')
		// .text('( '+value+' )');
		.text(value);
	switch(property) {
		case 'linkDistance':
			force['linkDistance'](value);
			force.start();
			break;
		case 'linkStrength':
			force['linkStrength'](value);
			force.start();
			break;
		case 'friction':
			force['friction'](value);
			force.start();
			break;
		case 'charge':
			force['charge'](value);
			force.start();
			break;
		case 'chargeDistance':
			force['chargeDistance'](value);
			force.start();
			break;
		case 'theta':
			force['theta'](value);
			force.start();
			break;
		case 'gravity':
			force['gravity'](value);
			force.start();
			break;
		case 'node_r':
			g['node_r'] = value;
			d3.selectAll('.nodecircles').attr('r', g['node_r']);
			break;
		case 'duration':
			g['duration'] = value;
			UpdateDurations();
			break;
	}
}

function BuildButtonCollection() {
	var newbuttons = {};
	var bx = -0.25;
	var by = 1;
	if (showYAxis === true) {
		DrawCollapsedButton(bx+0, by+2.5, 'Y');
		DrawCollapsedButton(bx+1, by+2.5, 'Y');
		DrawCollapsedButton(bx+2, by+2.5, 'Y');
	}
	if (showXAxis === true) {
		DrawCollapsedButton(bx+0, by-0, 'X');
		DrawCollapsedButton(bx+1, by-0, 'X');
		DrawCollapsedButton(bx+2, by-0, 'X');
	}
	// g['debugalphabuttons'] = true;
	if (g['debugalphabuttons']===true) {
		newbuttons['GoDeeperCiting']     = BuildButton(bx+0, by-1, false, 'GoDeeperCiting');
		newbuttons['GoDeeperPlane']      = BuildButton(bx+1, by-1, false, 'GoDeeperPlane');
		newbuttons['GoDeeperReferences'] = BuildButton(bx+2, by-1, false, 'GoDeeperReferences');
	}
	newbuttons['LoadCiting']     = BuildButton(bx+1, by+7.0, false, 'LoadCiting');
	newbuttons['TogglePlane']    = BuildButton(bx+2, by+6.0, false, 'TogglePlane');
	newbuttons['LoadReferences'] = BuildButton(bx+1, by+5.0, false, 'LoadReferences');
	newbuttons['ToggleMenu']     = BuildButton(bx+1, by+6.0, false, 'ToggleMenu');
	newbuttons['ToggleExaminer'] = BuildButton(bx+0, by+6.0, false, 'ToggleExaminer');
	if (showYAxis === true) {
		newbuttons['Ydecr'] 		 = BuildButton(bx+0, by+2.5, 'Y', 'decr');
		newbuttons['Yfree'] 		 = BuildButton(bx+1, by+2.5, 'Y', 'free');
		newbuttons['Yincr'] 		 = BuildButton(bx+2, by+2.5, 'Y', 'incr');
	}
	if (showXAxis === true) {
		newbuttons['Xdecr'] 		 = BuildButton(bx+0, by-0, 'X', 'decr');
		newbuttons['Xfree'] 		 = BuildButton(bx+1, by-0, 'X', 'free');
		newbuttons['Xincr'] 		 = BuildButton(bx+2, by-0, 'X', 'incr');
	}
	if (showYAxis === true) {
		newbuttons['Yincr'].attr('transform', 'scale(1,1)');
		newbuttons['Ydecr'].attr('transform', 'scale(1,1)');
	// newbuttons['Yfree'].attr('transform', 'scale(1,1)');
	}
	if (showXAxis === true) {
		newbuttons['Xincr'].attr('transform', 'scale(1,1)');
		newbuttons['Xdecr'].attr('transform', 'scale(1,1)');
		// newbuttons['Xfree'].attr('transform', 'scale(1,1)');
	}
	return newbuttons;
}

function BuildButton(xindex, yindex, XorY, buttonname) {
	var temptransform;
	if (XorY==='Y') {
		temptransform = 'scale(1,0)';
	}
	if (XorY==='X') {
		temptransform = 'scale(0,1)';
	}
	var tempx = LayoutX(xindex);
	var tempy = LayoutY(yindex);
	var newicon = sides.append('g')
		.attr('transform', function() {	return 'translate('+tempx+','+tempy+')'; });
	if (buttonname==='free' || buttonname==='incr' || buttonname==='decr') {
		newicon.classed('buttonroots'+XorY+buttonname, true);
	}
	// COLLAPSED BUTTONS
	// if (XorY==='Y') {
	// 	newicon.append('rect')
	// 		.attr('x', -g['iconsize']/2)
	// 		.attr('y', -g['iconedge']/2)
	// 		.attr('width', g['iconsize'])
	// 		.attr('height', g['iconedge']);
	// }
	// if (XorY==='X') {
	// 	newicon.append('rect')
	// 		.attr('x', -g['iconedge']/2)
	// 		.attr('y', -g['iconsize']/2)
	// 		.attr('width', g['iconedge'])
	// 		.attr('height', g['iconsize']);
	// }
	// if (XorY===false) {
	// 	// newicon = newicon.append('g')
	// 		// .attr('transform', 'rotate(45)')
	// 		// .append('g')
	// 		// .append('g').attr('transform', 'rotate(180)');
	// 		// .attr('transform', 'rotate(0)');
	// 	newicon.append('rect')
	// 		.attr('x', -g['iconsize']/2)
	// 		.attr('y', -g['iconedge']/2)
	// 		.attr('width', g['iconsize'])
	// 		.attr('height', g['iconedge']);
	// }
	newicon = newicon.append('g');
	var iconimage = newicon.append('g')
		.attr('preserveAspectRatio', 'none');
	if (buttonname==='GoDeeperReferences') {
		iconimage
			.call(BuildIcon, 'GoDeeperReferences', XorY);
		newicon
			.on('mouseover', function() { UpdateHelpText('Load the references for every current paper'); })
			.on(g['buttoneventtype'], function() {
				if (g['vamptime']===0) {
					GoDeeperReferences();
					Vamp(g['duration']);
				}
			});
		return newicon;
	}
	if (buttonname==='GoDeeperCiting') {
		iconimage
			.call(BuildIcon, 'GoDeeperCiting', XorY);
		newicon
			.on('mouseover', function() { UpdateHelpText('Load the papers citing every current paper'); })
			.on(g['buttoneventtype'], function() {
				if (g['vamptime']===0) {
					GoDeeperCiting();
					Vamp(g['duration']);
				}
			});
		return newicon;
	}
	if (buttonname==='GoDeeperPlane') {
		iconimage
			.call(BuildIcon, 'GoDeeperPlane', XorY);
		newicon
			.on('mouseover', function() { UpdateHelpText('Toggle the time plane for every current paper'); })
			.on(g['buttoneventtype'], function() {
				if (g['vamptime']===0) {
					GoDeeperPlane();
					Vamp(g['duration']);
				}
			});
		return newicon;
	}            
	if (buttonname==='ToggleExaminer') {
		iconimage
			.call(BuildIcon, 'ToggleExaminer', XorY);
		newicon
			.on('mouseover', function() {
				UpdateHelpText('Toggle the node examiner');
			})
			.on(g['buttoneventtype'], function() {
				if (g['vamptime']===0 && g['node_this']!==false) {
					ToggleExaminer(g['node_this']);
				}
			});
		return newicon;
	}
	if (buttonname==='ToggleMenu') {
		iconimage
			.call(BuildIcon, 'ToggleMenu', XorY);
		newicon
			.on('mouseover', function() {
					UpdateHelpText('Toggle the menu for the selected paper');					// }
			})
			.on(g['buttoneventtype'], function() {
				if (g['vamptime']===0 && g['node_this']!==false) {
					nodes.filter(function(d) { return d.menuout===true; })
						.each(function() { ToggleMenu(this); });
					ToggleMenu(g['node_this']);
				}
			});
		return newicon;
	}
	if (buttonname==='LoadCiting') {
		iconimage
			.call(BuildIcon, 'LoadCiting', XorY);
		newicon
			.on('mouseover', function() {
				if (g['node_d'].citingout || g['node_d'].nociting) {
					UpdateHelpText('Citing papers are already loaded for the selected paper');
				}
				else {
					UpdateHelpText('Load the papers citing the selected paper');
				}
			})
			.on(g['buttoneventtype'], function() {
				if (g['vamptime']===0) {
					UpdateHelpText('Citing papers are already loaded for the selected paper');
					if (g['node_d'].citingout || g['node_d'].nociting) {
						//
					} else {
						LoadCiting(g['node_this']);
					}
				}
			});
		return newicon;
	}
	if (buttonname==='LoadReferences') {
		iconimage
			.call(BuildIcon, 'LoadReferences', XorY);
		newicon
			.on('mouseover', function() {
				if (g['node_d'].referencesout || g['node_d'].noreferences) {
					UpdateHelpText('References are already loaded for the selected paper');
				}
				else {
					UpdateHelpText('Load the references for the selected paper');
				}
			})
			.on(g['buttoneventtype'], function() {
				if (g['vamptime']===0) {
					UpdateHelpText('References are already loaded for the selected paper');
					if (g['node_d'].referencesout || g['node_d'].noreferences) {
						//
					} else {
						LoadReferences(g['node_this']);
					}
				}
			});
		return newicon;
	}
	if (buttonname==='TogglePlane') {
		iconimage
			.call(BuildIcon, 'TogglePlane', XorY);
		newicon
			.on('mouseover', function() {
				// if (g['node_this']!==false) {
					if (g['node_d'].planeout===true) {
						UpdateHelpText('Collapse the time plane for the selected paper');
					}
					else {
						UpdateHelpText('Expand the time plane for the selected paper (blocking newer papers)');
					}
				// }
			})
			.on(g['buttoneventtype'], function() {
				if (g['vamptime']===0 && g['node_this']!==false) {
					if (g['node_d'].planeout===true) {
						UpdateHelpText('Expand the time plane for the selected paper (blocking newer papers)');
					}
					else {
						UpdateHelpText('Collapse the time plane for the selected paper');
					}
					TogglePlane(g['node_this']);
					// nodes.filter(function(d) { return d.menuout===true; })
					// 	.each(function() { ToggleMenu(this); })
				}
			});
		return newicon;
	}
	if (buttonname==='free') {
		iconimage
			.call(BuildIcon, 'free', XorY);
		newicon
			.attr('transform', temptransform)
			.classed('buttons'+XorY+buttonname, true)
			.on('mouseover', function() { UpdateHelpText('Remove all sorting on the '+XorY+' Axis'); })
			// .on('mouseover', function() { UpdateHelpText('Sort the '+XorY+' Axis by unsorted (force-directed graph)'); })
			.on(g['buttoneventtype'], function() {
				if (g['vamptime']===0 || g['vampOverride']===true) {
					if (g[XorY+'sortnew']!=='free') {
						// ClearHelpText();
						g[XorY+'sortold'] = g[XorY+'sortnew'];
						g[XorY+'sortnew'] = 'free';
						TransformView(XorY);
						UpdateButton(XorY, 'free');
					}
				}
			});
		return newicon;
	}
	if (buttonname==='decr') {
		iconimage
			.call(BuildIcon, 'triangledecr', XorY);
		newicon
			.attr('transform', temptransform)
			.classed('buttons'+XorY+buttonname, true)
			.on('mouseover', function() { UpdateHelpText('Sort the '+XorY+' Axis by decreasing values'); })
			.on(g['buttoneventtype'], function() {
				if (g['vamptime']===0 || g['vampOverride']===true) {
					if (g[XorY+'sortnew']!=='decr') {
						// ClearHelpText();
						g[XorY+'sortold'] = g[XorY+'sortnew'];
						g[XorY+'sortnew'] = 'decr';
						TransformView(XorY);
						UpdateButton(XorY, 'decr');
					}
				}
			});
		return newicon;
	}
	if (buttonname==='incr') {
		iconimage
			.call(BuildIcon, 'triangleincr', XorY);
		newicon
			.attr('transform', temptransform)
			.classed('buttons'+XorY+buttonname, true)
			.on('mouseover', function() { UpdateHelpText('Sort the '+XorY+' Axis by increasing values'); })
			.on(g['buttoneventtype'], function() {
				if (g['vamptime']===0 || g['vampOverride']===true) {
					if (g[XorY+'sortnew']!=='incr') {
						// ClearHelpText();
						g[XorY+'sortold'] = g[XorY+'sortnew'];
						g[XorY+'sortnew'] = 'incr';
						TransformView(XorY);
						UpdateButton(XorY, 'incr');
					}
				}
			});
		return newicon;
	}
}

function UpdateButton(XorY, buttonname) {
	if (buttonname==='LoadReferences') {
		buttons['LoadReferences']
			.attr('transform', 'rotate(0)');
		RotateIcon('LoadReferences', 359.9);
	}
	if (buttonname==='LoadCiting') {
		buttons['LoadCiting']
			.attr('transform', 'rotate(0)');
		RotateIcon('LoadCiting', 359.9);
	}
	if (buttonname==='ToggleExaminer') {
		buttons['ToggleExaminer']
			.attr('transform', 'rotate(0)');
		RotateIcon('ToggleExaminer', 359.9);	
	}
	if (buttonname==='ToggleMenu') {
		buttons['ToggleMenu']
			.attr('transform', 'rotate(0)');
		if (g['node_d'].menuout===false) {
			RotateIcon('ToggleMenu', 359.9);
		}
		else {
			RotateIcon('ToggleMenu', -359.9);
		} 
	}
	if (buttonname==='TogglePlane') {
		buttons['TogglePlane']
			.attr('transform', 'rotate(0)');
		if (g['node_d'].planeout===false) {
			RotateIcon('TogglePlane', -359.9);
		}
		else {
			RotateIcon('TogglePlane', 359.9);
		}
	}
	if (buttonname==='GoDeeperReferences') {
		buttons['GoDeeperReferences']
			.attr('transform', 'rotate(0)');
		RotateIcon('GoDeeperReferences', 359.9);	
	}
	if (buttonname==='GoDeeperCiting') {
		buttons['GoDeeperCiting']
			.attr('transform', 'rotate(0)');
		RotateIcon('GoDeeperCiting', 359.9);	
	}
	if (buttonname==='GoDeeperPlane') {
		buttons['GoDeeperPlane']
			.attr('transform', 'rotate(0)');
		var planeoutfilter = nodes.filter(function(d) { return d.planeout===true; });
		if (planeoutfilter.empty()===true) {
			RotateIcon('GoDeeperPlane', -359.9);	
		}
		else {
			RotateIcon('GoDeeperPlane', 359.9);	
		}
	}
	if (buttonname==='free' || buttonname==='incr' || buttonname==='decr') {
		var tempy;
		var vx = 0;
		if (XorY==='Y') { tempy = 2.5; }
		if (XorY==='X') { tempy = 0.0; }
		if (buttonname==='decr' && g[XorY+'sortold']==='free') { // decr incr
			ExpandButton(XorY, 'free');
			CollapseButton(XorY, 'decr');
			// UpdateHelpText('Remove all sorting on the '+XorY+' Axis');
		}
		if (buttonname==='incr' && g[XorY+'sortold']==='free') { // decr incr
			ExpandButton(XorY, 'free');
			CollapseButton(XorY, 'incr');
			// UpdateHelpText('Remove all sorting on the '+XorY+' Axis');
		}
		if (buttonname==='free' && g[XorY+'sortold']==='decr') { // free incr
			CollapseButton(XorY, 'free');
			ExpandButton(XorY, 'decr');
			// UpdateHelpText('Sort the '+XorY+' Axis by decreasing values');
		}
		if (buttonname==='free' && g[XorY+'sortold']==='incr') { // decr free
			CollapseButton(XorY, 'free');
			ExpandButton(XorY, 'incr');
			// UpdateHelpText('Sort the '+XorY+' Axis by increasing values');
		}
		if (buttonname==='incr' && g[XorY+'sortold']==='decr') { // free incr
			CollapseButton(XorY, 'incr');
			ExpandButton(XorY, 'decr');
			// UpdateHelpText('Remove all sorting on the '+XorY+' Axis');
		}
		if (buttonname==='decr' && g[XorY+'sortold']==='incr') { // decr free
			CollapseButton(XorY, 'decr');
			ExpandButton(XorY, 'incr');
			// UpdateHelpText('Remove all sorting on the '+XorY+' Axis');
		}					
	}
} 

function ExpandButton(XorY, buttonname) {
	buttons[XorY+buttonname]
		.style('pointer-events', 'inherit')
		.transition()
			.ease(g['easeiconout'])
			.duration(g['duration'])
			.delay(g['durationtranslate']-g['duration'])
			.attr('transform', 'scale(1,1)');
}

function CollapseButton(XorY, buttonname) {
	var temptransform;
	if (XorY==='Y') {
		temptransform = 'scale(1,0)';
	}
	if (XorY==='X') {
		temptransform = 'scale(0,1)';
	}
	d3.selectAll('.buttons'+XorY+buttonname)
		.style('pointer-events', 'none')
		.transition()
			.ease(g['easeiconin'])
			.duration(g['duration'])
			.attr('transform', temptransform);
}

function RotateIcon(buttonname, degrees) {
	buttons[buttonname]
		.transition()
			.ease(g['easeiconin'])
			.duration((1/2)*g['duration'])
			.attr('transform', 'rotate('+(1/2)*degrees+')')
		.transition()
			.ease(g['easeiconout'])
			.duration((1/2)*g['duration'])
			.attr('transform', 'rotate('+(2/2)*degrees+')');
}

function UpdateNodesClass(option, bool) {
		d3.selectAll('.nodecircles')
			.classed(option, bool);
}

function UpdateSpecificNodeClass(node_this, option, bool) {
	var node_d = d3.select(node_this).datum();
	d3.select(node_this).selectAll('.nodecircles')
		.classed(option, bool);
	d3.selectAll('.linkcovers')
		.filter(function(d) {
			return d.source.name===node_d.name;
		})
		.call(GetClassesForLinkcover);
}

function UpdateAdjacentElementsClass(node_this, option, bool) {
	var nodeend, adjacentend;
	var node_d = d3.select(node_this).datum();
	if (option==='references') {
		nodeend = 'source';
		adjacentend = 'target';
	}
	if (option==='citing') {
		nodeend = 'target';
		adjacentend = 'source';
	}
	links.selectAll('line')
		.filter(function(d) { return d[nodeend].name===node_d.name; })
		.classed(option, bool)
		.each(function(d) {
			var link_datum = d;
			d3.selectAll('.nodecircles')
				.filter(function(d) { return link_datum[adjacentend].name===d.name; })
				.classed('notselected', false)
				.each(function() {
					var node_this = this.parentNode;
					UpdateSpecificNodeClass(node_this, option, bool);
				});
		});
}

function UpdateLinksClass(option, bool) {
	links.selectAll('line')
		.classed(option, bool);
}

function SelectNode(node_this) {
	// nodes.each(function(d) { d.fixed = false; });
	if (g['node_this']!==false) {
		g['node_oldname'] = d3.select(g['node_this']).datum().name;
	}
	g['node_this'] = node_this;
	g['node_d'] = d3.select(node_this).datum();
	// g['node_d'].fixed = true;

	UpdateNodesClass('notselected', true);
	UpdateNodesClass('selected', false);
	UpdateNodesClass('references', false);
	UpdateNodesClass('citing', false);
	UpdateSpecificNodeClass(node_this, 'notselected', false);
	UpdateSpecificNodeClass(node_this, 'selected', true);

	UpdateLinksClass('references', false);
	UpdateLinksClass('citing', false);
	UpdateAdjacentElementsClass(node_this, 'references', true);
	UpdateAdjacentElementsClass(node_this, 'citing', true);
	// if (g['graphfilldepth']>1) {
	// 	d3.selectAll('.nodecircles.references')
	// 		.each(function() {
	// 			var node_this = this.parentNode;
	// 			UpdateAdjacentElementsClass(node_this, 'references', true);
	// 		});
	// 	d3.selectAll('.nodecircles.citing')
	// 		.each(function() {
	// 			var node_this = this.parentNode;
	// 			UpdateAdjacentElementsClass(node_this, 'citing', true);
	// 		});
	// }
	BuildAxesObjectCollection('axesticks', g['node_d']);
	if (g['Ysortnew']==='incr') {
		TransformAxesObjectsCollection('axesticks', 'Y', 'incr', 'instant');
	} 
	if (g['Ysortnew']==='decr') {
		TransformAxesObjectsCollection('axesticks', 'Y', 'decr', 'instant');
	}
	if (showXAxis === true) {
		if (g['Xsortnew']==='incr') {
			TransformAxesObjectsCollection('axesticks', 'X', 'incr', 'instant');
		}
		if (g['Xsortnew']==='decr') {
			TransformAxesObjectsCollection('axesticks', 'X', 'decr', 'instant');
		}
	} 
	arxivtext
		.data([g['node_d']])
		.attr('xlink:href', function(d) { return d.link; })
		.select('text')
			.text(function(d) {	return d.title; });
	BuildExaminerDiv(node_this);
}

function BuildExaminerDiv(node_this) {
	d3.selectAll('.examinerbg').remove();
	d3.selectAll('.examinerdiv').remove();
	d3.selectAll('.examinertext1').remove();
	d3.selectAll('.examinertext2').remove();
	var node_d = d3.select(node_this).datum();
	var temparray = [
		{display:'Date Published', option:MonthString(node_d['month'])+' '+node_d['year']},
		{display:'# Times Cited',  option:node_d['citedby']},
		{display:'# References',   option:node_d['referencing']},
		{display:'arXiv ID',       option:node_d['name']}
	];
	var tempx = 0*g['sidesleft'] + parseFloat(node_d.newx) + g['stagerootx'];
	var tempy = 0*g['sidestop']  + parseFloat(node_d.newy) + g['stagerooty'];
	var tempheight = g['font-size']*temparray.length;
	var tempwidth1 = 132;
	var tempwidth2 = 153;
	var temptop = tempy - tempheight - Radius(3);
	var templeft1 = tempx + Radius(2);
	var templeft2 = tempwidth1 + Radius(2) + tempx + g['font-size']/2;
	var tempopacitybg, tempopacitytext;
	if (g['examiner']===true) {
		tempopacitybg = g['examinerbgopacity'];
		tempopacitytext = 1;
	}
	if (g['examiner']===false) {
		tempopacitybg = 0;
		tempopacitytext = 0;
	}
	examinerdivroot
		.append('div').classed('examinerbg', true)
			.style('opacity', tempopacitybg)
			.style('left', templeft1 + 'px')
			.style('top',  temptop + 'px')
			.style('width', tempwidth1 + tempwidth2 + 'px')
			.style('height', tempheight + g['font-size'] + 'px');
	var examinerdiv1 = examinerdivroot
		.append('div').classed('examinerdiv', true)
			.style('left', templeft1 + 'px')
			.style('top',  temptop + 'px')
			.style('width', tempwidth1 + 'px')
			.style('height', tempheight + 'px');
	var examinerdiv2 = examinerdivroot
		.append('div').classed('examinerdiv', true)
			.style('left', templeft2 + 'px')
			.style('top',  temptop + 'px')
			.style('width', tempwidth2 + 'px')
			.style('height', tempheight + 'px');
	examinerdiv1
		.selectAll('.examinertext1')
		.data(temparray)
		.enter()
		.append('text')
			.classed('examinertext1', true)
			.style('opacity', tempopacitytext)
			.style('top', function(d, i) { return i*(g['font-size']+2)+2 + 'px'; })
			.text(function(d) { return d.display; });
	examinerdiv2
		.selectAll('.examinertext2')
		.data(temparray)
		.enter()
		.append('text')
			.classed('examinertext2', true)
			.style('opacity', tempopacitytext)
			.style('top', function(d, i) { return i*(g['font-size']+2)+2 + 'px'; })
			.text(function(d) { return d.option; });
}

function GetClassesForLinkcover(selection) {
	selection
		.attr('class', function(d) {
			var linkcovername = d.source.name;
			var node_this = nodes.filter(function(d) {
					return d.name===linkcovername;
				})[0][0];
			var circleclasses = d3.select(node_this).selectAll('circle').attr('class');
			return circleclasses;
		})
		.classed('linkcovers', true)
		.classed('blanked', g['linkcoversblankedfinal']);
	return selection;
}

function Sorttimes() {
	d3.selectAll('.allforceelements').sort(function(a,b) {
		return d3.descending(a.time, b.time);
	});
}

function TransformAxesObjectsCollection(kind, XorY, view, tempease) {
	var viewoption;
	for (var i=0; i<viewoptions.length; i++) {
		viewoption = viewoptions[i]['option'];
		// if (kind==='axesticks') {
			TransformAxesObjects(kind, viewoption, XorY, view, tempease);
			// TransformAxesObjects(kind, viewoption, XorY, view, tempease, 'references');
			// TransformAxesObjects(kind, viewoption, XorY, view, tempease, 'citing');
		// }
		// else {
		// 	TransformAxesObjects(kind, viewoption, XorY, view, tempease);
		// }
	}
}

function BuildAxesObject(kind, viewoption, value, XorY, classname) {
	var tempx = (-1/2)*g['tickwidth'] + (1)*g['axesbarsize'];
	var tempy = 0;
	var tempwidth = g['tickwidth']-2*g['axesbarsize'];
	var tempheight = g['tickheight'];
	var temptransform = 'rotate(0)';
	if (XorY==='X') {
		temptransform = 'rotate(90)';
		if (kind==='axesgridlines') {
			temptransform = 'rotate(-90)';
		}
	}
	var tempdata = {};
	tempdata[viewoption] = value;
	var axesobject = axes[viewoption][XorY]
		.select('.'+XorY+'rooty');
	if (kind==='axeslabels' || kind==='axesgridlines') {
		axesobject = axesobject.append('g');
	}
	else if (kind==='axesticks') {
		axesobject = axesobject.insert('g', '.'+viewoption+'axeslabels_'+XorY);
	}
	axesobject = axesobject.datum(tempdata)
		.classed(viewoption+kind+'_'+XorY, true)
		.classed('blit'+XorY, true)
		.append('g')
		.attr('transform', function() { return temptransform; });
	if (kind==='axeslabels') {
		axesobject = axesobject.append('text')
			.text(function(d) { return d[viewoption]; });
	}
	else if (kind==='axesticks') {
		axesobject = axesobject.append('rect')
			.classed(classname, true)
			.attr('x', tempx)
			.attr('y', tempy)
			.attr('width', tempwidth)
			.attr('height', tempheight);
	}
	else if (kind==='axesgridlines') {
		axesobject = axesobject.append('rect')
			.attr('x', -1*tempx)
			.attr('y', tempy)
			.attr('width', g['axessize'] + g['stagewidth'])
			.attr('height', 0.5);
	}
	axesobject
		// .style('pointer-events', 'none')
		.classed(kind, true);
}

function TransformAxesObjects(kind, viewoption, XorY, view, tempease) {
	var otherXorY, tempsign;
	var axesobjects = d3.selectAll('.'+viewoption+kind+'_'+XorY);
	axesobjects.each(function(d) {
		d.tempoffset = {'X':0, 'Y':0};
		if (XorY==='Y') {
			otherXorY = 'X';
			tempsign = -1;
		}
		else if (XorY==='X') {
			otherXorY = 'Y';
			tempsign = 1;
		}
		d.tempoffset[otherXorY] = tempsign*(1/2)*g['axessize'];
		if (view!=='free') {
			d.tempoffset[XorY] = tempsign*scales[viewoption][XorY][view](d[viewoption]);
		}
	});
	if (tempease!=='instant') {
		axesobjects.transition()
			.ease(tempease)
			.call(StaggerTransition, 'axesobjects', XorY)
			.attr('transform', function(d) {
				return 'translate('+d.tempoffset['X']+','+d.tempoffset['Y']+')';
			});
	}
	else {
		axesobjects.
			attr('transform', function(d) {
				return 'translate('+d.tempoffset['X']+','+d.tempoffset['Y']+')';
			});
	}
}

function BuildAxesObjectCollection(kind, node_d) {
	d3.selectAll('.axesticks').remove();
	var viewoption;
	var value;
	for (var i=0; i<viewoptions.length; i++) {
		viewoption = viewoptions[i]['option'];
		value = node_d[viewoption];
		if (showYAxis === true) {
			BuildAxesObject('axesticks', viewoption, value, 'Y', 'selected');
		}
		if (showXAxis === true) {
			BuildAxesObject('axesticks', viewoption, value, 'X', 'selected');
		}
		// BuildAxesObject('axesticks', viewoption, value, 'Y', 'references');
		// BuildAxesObject('axesticks', viewoption, value, 'X', 'references');
		// BuildAxesObject('axesticks', viewoption, value, 'Y', 'citing');
		// BuildAxesObject('axesticks', viewoption, value, 'X', 'citing');
	}
}

function AttemptLinkNode(kind, node_this) {
	var returnvalue;
	var node_d = d3.select(node_this).datum();
	if (node_d[kind+'out']===false && node_d['no'+kind]===false) {
		if (kind==='references') {
  			returnvalue = ReferencesNode(node_this);
  		}
  		else if (kind==='citing') {
  			returnvalue = CitingNode(node_this);
  		}	
		if (returnvalue) {
			node_d[kind+'out'] = true;
		}
		else {
			node_d['no'+kind] =true;
		}
	}
}

function ReferencesNode(node_this) {
	var node_d = d3.select(node_this).datum();
	var newnode;
	var randomangle;
	var returnreferencing = false;
	// LINKS
	g['json'].links.forEach(function(link) {
		if (link.visible!==true) {
			if (link.source.name===node_d.name) {
				// Do not add nodes with year order problems
				if (link.source.time > link.target.time) {
		    		// Do not re-add nodes
		    		// console.log(namehashlookup[link.target.name].visible===true, 'namehashlookup[link.target.name].visible');
					if (namehashlookup[link.target.name].visible !== true) {
						namehashlookup[link.target.name].visible = true;
		      			returnreferencing = true;
		      			randomangle = RandomInclusive()*2*Math.PI;
		      			namehashlookup[link.target.name].x = node_d.x + 10*Math.cos(randomangle);
		      			namehashlookup[link.target.name].y = node_d.y + 10*Math.sin(randomangle);
		      			force.nodes().push(namehashlookup[link.target.name]);
		      			// timeTICKS
	      			  	var time = namehashlookup[link.target.name].time;
					}
		    		force.links().push({
		      			source: namehashlookup[link.source.name],
		      			target: namehashlookup[link.target.name]
					});
		    		link.visible = true;
		    	}
			}
		}
	});
	return returnreferencing;
}

function CitingNode(node_this) {
	var node_d = d3.select(node_this).datum();
	var newnode;
	var randomangle;
	var returnciting = false;
	// LINKS
	g['json'].links.forEach(function(link) {
		if (link.visible!==true) {
			if (link.target.name===node_d.name) {
				// Do not add nodes with year order problems
				if (link.source.time > link.target.time) {
		    		// Do not re-add nodes
		    		// console.log(namehashlookup[link.source.name].visible===true, 'namehashlookup[link.source.name].visible');
					if (namehashlookup[link.source.name].visible !== true) {
						namehashlookup[link.source.name].visible = true;
		      			returnciting = true;
		      			randomangle = RandomInclusive()*2*Math.PI;
		      			namehashlookup[link.source.name].x = node_d.x + 10*Math.cos(randomangle);
		      			namehashlookup[link.source.name].y = node_d.y + 10*Math.sin(randomangle);
		      			force.nodes().push(namehashlookup[link.source.name]);
		      			// timeTICKS
	      			  	var time = namehashlookup[link.source.name].time;
					}
		    		force.links().push({
		      			source: namehashlookup[link.source.name],
		      			target: namehashlookup[link.target.name]
					});
		    		link.visible = true;
		    	}
			}
		}
	});
	return returnciting;
}

function GoDeeperReferences() {
	UpdateButton(false, 'GoDeeperReferences');
	d3.selectAll('.menus.references')
		.each(function() {
			var node_this = this.parentNode;
			var node_d = d3.select(node_this).datum();
			LoadReferences(node_this);
			// if (node_d.menuout===true) {
			// 	ToggleMenu(node_this);
			// }
		});
}

function GoDeeperCiting() {
	UpdateButton(false, 'GoDeeperCiting');
	d3.selectAll('.menus.citing')
		.each(function() {
			var node_this = this.parentNode;
			var node_d = d3.select(node_this).datum();
			LoadCiting(node_this);
			// if (node_d.menuout===true) {
			// 	ToggleMenu(node_this);
			// }
		});
}

function GoDeeperPlane() {
	UpdateButton(false, 'GoDeeperPlane');
	var planeoutfilter = nodes.filter(function(d) { return d.planeout===true; });
	var planesin  = nodes.filter(function(d) { return d.planeout===false; });
	if (planeoutfilter.empty()===true || planesin.empty()===true) {
		nodes.each(function() {
			TogglePlane(this);
		});
		return;
	}
	else {
		// Mixed in/out planes
		planeoutfilter.each(function() {
			var node_this = this;
			var node_d = d3.select(node_this).datum();
			RemoveTimePlane(node_this);
			UpdateButton(false, 'TogglePlane');
			if (node_d.menuout===true) {
				ExpandOptionPiece(node_this, 'time');
			}
			else {
				d3.select(node_this).selectAll('.menus.time')
					.call(SetArcDataFromAttr, 'current', 'current')
					.call(SetArcDataFromData, 'max', 'oldmax')
					.style('pointer-events', 'inherit');
			}
		});
	}
}

function ToggleExaminer() {
	Vamp(g['duration']);
	UpdateButton(false, 'ToggleExaminer');
	if (g['examiner']===true) {
		d3.selectAll('.examinerbg,.examinertext1,.examinertext2')
			.transition()
				.ease(g['easeflipout'])
				.duration(g['duration'])
				.style('opacity', 0);
		g['examiner'] = false;
	}
	else {
		d3.selectAll('.examinertext1,.examinertext2')
			.transition()
				.ease(g['easeflipin'])
				.duration(g['duration'])
				.style('opacity', 1);
		d3.selectAll('.examinerbg')
			.transition()
				.ease(g['easeflipin'])
				.duration(g['duration'])
				.style('opacity', g['examinerbgopacity']);
		g['examiner'] = true;
	}
}

function TransformLinks(selection, tempease, XorY) {
	if (tempease==='instant') {
		selection.selectAll('line')
	  		.attr('x1', function(d) { return d.source.newx;	})
	  		.attr('y1', function(d) { return d.source.newy;	})
			.attr('x2', function(d) { return d.target.newx;	})
			.attr('y2', function(d) { return d.target.newy;	});
	}
	else {
		selection.selectAll('line').transition()
			.ease(tempease)
			.call(StaggerTransition, 'links', XorY)
	  		.attr('x1', function(d) { return d.source.newx;	})
	  		.attr('y1', function(d) { return d.source.newy;	})
			.attr('x2', function(d) { return d.target.newx;	})
			.attr('y2', function(d) { return d.target.newy;	});
	}
}

function TransformNodes(selection, tempease, XorY) {
	var bound = d3.select('rect.stagebg')[0][0].getBoundingClientRect();
	selection
		.each(function(d) {
	    	d.newx = d.x*g['Xzoom'];
	    	d.newy = d.y*g['Yzoom'];
			if (g['Ysortnew']==='incr') {
	      		d.newy = g['stageheight'] - scales[g['Yviewnew']]['Y']['incr'](d[g['Yviewnew']]);
			}
			if (g['Ysortnew']==='decr') {
	      		d.newy = g['stageheight'] - scales[g['Yviewnew']]['Y']['decr'](d[g['Yviewnew']]);
			}
			if (g['Xsortnew']==='incr') {
	      		d.newx = scales[g['Xviewnew']]['X']['incr'](d[g['Xviewnew']]);
			}
			if (g['Xsortnew']==='decr') {
	      		d.newx = scales[g['Xviewnew']]['X']['decr'](d[g['Xviewnew']]);
			}
			// stay withing bounds
			// if (showXAxis === false) {
				// d.newx = Math.max(d.newx, (-0.5)*g['stagewidth']);
				// d.newx = Math.min(d.newx, (1.5)*g['stagewidth']);
			// }
			// if (showYAxis === false) {
				// d.newy = Math.max(d.newy, (-0.5)*g['stageheight']);
				// d.newy = Math.min(d.newy, (1.5)*g['stageheight']);
			// }
		});
	if (tempease==='instant') {
		selection
			.attr('transform', function(d) { return 'translate('+d.newx+','+d.newy+')';	});
	}
	else {
		selection.transition()
			.ease(tempease)
			.call(StaggerTransition, 'nodes', XorY)
			.attr('transform', function(d) { return 'translate('+d.newx+','+d.newy+')';	}); 
	}
}

function TransformLinkcovers(tempease, XorY) {
  	var selection = d3.selectAll('.linkcovers')
  		.each(function(d) {
  			if (g['Xsortnew']!=='free' && g['Ysortnew']!=='free' && g['Xviewnew']==='index' && g['Yviewnew']==='index') {
				d.tempcx = d.source.newx;
				d.tempcy = d.target.newy;
			}
			else {
				d.tempcx = d.source.newx;
				d.tempcy = d.source.newy;
  			}
  		});
  	if (tempease==='instant') {
  		selection
  			.attr('cx', function(d) { return d.tempcx;	})
  			.attr('cy', function(d) { return d.tempcy;	});
  	}
  	else {
		if (g['Xsortnew']!=='free' && g['Ysortnew']!=='free' && g['Xviewnew']==='index' && g['Yviewnew']==='index') {
			// Remember last opacity
			if (g['linkcoversexposed']===false) {
				g['linkcoversopacitystart'] = 0;
				g['linkcoversopacityfinal'] = 1;
				g['linkcoversblankedstart'] = true;
				g['linkcoversblankedfinal'] = true;	
			}
			else if (g['linkcoversexposed']===true) {
				g['linkcoversopacitystart'] = 1;
				g['linkcoversopacityfinal'] = 1;
				g['linkcoversblankedstart'] = true;
				g['linkcoversblankedfinal'] = true;	
			}
			g['linkcoversexposed'] = true;
		}
		else {
			if (g['linkcoversexposed']===false) {
				g['linkcoversopacitystart'] = 1;
				g['linkcoversopacityfinal'] = 1;
				g['linkcoversblankedstart'] = false;
				g['linkcoversblankedfinal'] = false;	
			}
			else if (g['linkcoversexposed']===true) { // Coming out of double loading order
				g['linkcoversopacitystart'] = 1;
				g['linkcoversopacityfinal'] = 0;
				g['linkcoversblankedstart'] = true;
				g['linkcoversblankedfinal'] = false;	
			}
			g['linkcoversexposed'] = false;
  		}
  		selection.transition()
			.ease(tempease)
			.call(StaggerTransition, 'linkcovers', XorY)
			.each('start', function() {
				selection
					.style('opacity', g['linkcoversopacitystart'])
					.classed('blanked', g['linkcoversblankedstart']);
			})
			.attr('cx', function(d) { return d.tempcx;	})
			.attr('cy', function(d) { return d.tempcy;	})
			.style('opacity', g['linkcoversopacityfinal'])
			.each('end', function() {
				selection
					.style('opacity', 1)
					.classed('blanked', g['linkcoversblankedfinal']);
			});
	}
}

// FORCE TICK
function Tick() {
	TransformNodes(nodes, 'instant');
	TransformLinkcovers('instant');
	TransformLinks(links, 'instant');
}

function StaggerTransition(transition, objecttype, XorY) {
	transition
		// .each(function(d, i) {
		// 	// if (objecttype==='nodes')       { d.tempindex = d.index; }
		// 	// if (objecttype==='linkcovers')  { d.tempindex = d.source.index;	}
		// 	// if (objecttype==='links')       { d.tempindex = d.source.index; }
		// 	// if (objecttype==='axesobjects') { d.tempindex = i/5.0; }
		// 	if (objecttype==='nodes')       { d.tempindex = g['yearmax']+1 - d.time; }
		// 	if (objecttype==='linkcovers')  { d.tempindex = g['yearmax']+1 - d.source.time;	}
		// 	if (objecttype==='links')       { d.tempindex = g['yearmax']+1 - d.source.time; }
		// 	if (objecttype==='axesobjects') { d.tempindex = i*(100/g['staggerfactor']); }
		// })
		// .delay(function(d, i) {
		// 	// return (d.tempindex%g['staggermodulo'])*g['staggerfactor'];
		// 	return d.tempindex*g['staggerfactor'];
		// })
		// .duration(function(d, i) {
		// 	return g['duration']*(7/8)-(d.tempindex+1)*g['staggerfactor'];
		// })
		// .delay(function(d, i) {
		// 	// if (objecttype==='axesobjects') {
		// 	// 	console.log(objecttype, i);
		// 	// }
		// 	// d.delay = (i*5) % g['duration'];
		// 	// d.delay = Math.random()*500;
		// 	d.delay = i*10;
		// 	return d.delay;
		// })
		// .duration(function(d, i) {
		// 	return (1)*g['duration'] + (-1)*d.delay;
		// })
		.delay(function(d, i) {
			if (i > g['currentmaxi']) {
				g['currentmaxi'] = i;
			}
			d.ifraction = i/g['currentmaxi'];
			d.delay = d.ifraction * 0.05*g['duration'];
			// d.delay = (i*10 + Math.floor(10*Math.random()))%(1*g['duration']);
			return d.delay;
		})
		.duration(function(d, i) {
			return g['durationtranslate'] - d.delay;
		})
		// .duration(g['duration'])
		;
	return transition;
}

function EndAll(transition, callback) { 
    var n = 0; 
    transition 
        .each(function() { ++n; }) 
        .each('end', function() {
        	if (!--n) callback.apply(this, arguments);
        }); 
} 

function StartAll(transition, callback) {
	var n = 0; 
    transition 
        .each(function() { ++n; }) 
        .each('start', function() {
        	if (!--n) callback.apply(this, arguments);
        }); 
}

function LoadReferences(node_this) {
	Vamp(g['duration']);
	var node_d = d3.select(node_this).datum();
	// node_d.fixed = true;
	var testnode = nodes.filter(function(d) { return d.index===1; })[0][0];
	UpdateButton(false, 'LoadReferences');
	if (node_d.referencesout || node_d.noreferences) {
	// 	node_d.fixed = false;
	}
	else {
		AttemptLinkNode('references', node_this);
		Refresh();
		// UpdateButton(false, 'LoadReferences');
		if (node_d.menuout===true) {
			CollapseOptionPiece(node_this, 'references');
		}
		else {
			CollapseOptionPiece(node_this, 'references', 'instant');
		}
		// TransitionVamp(g['duration']).each('end', function() {
		// 	node_d.fixed = false;
		// });
	}

}

function LoadCiting(node_this) {
	Vamp(g['duration']);
	var node_d = d3.select(node_this).datum();
	// node_d.fixed = true;
	UpdateButton(false, 'LoadCiting');
	if (node_d.citingout || node_d.nociting) {
		// node_d.fixed = false;
	}
	else {
		AttemptLinkNode('citing', node_this);
		Refresh();
		// UpdateButton(false, 'LoadCiting');
		if (node_d.menuout===true) {
			CollapseOptionPiece(node_this, 'citing');
		}
		else {
			CollapseOptionPiece(node_this, 'citing', 'instant');
		}
		// TransitionVamp(g['duration']).each('end', function() {
		// 	node_d.fixed = false;
		// });
	}
}

function RemoveTimePlane(node_this) {
	var node_d = d3.select(node_this).datum();
	RemoveTimePlanePiece(node_this, 'topleft', false);
	RemoveTimePlanePiece(node_this, 'topright', false);
	RemoveTimePlanePiece(node_this, 'bottomleft', false);
	RemoveTimePlanePiece(node_this, 'bottomright', false);
	node_d.planeout = false;
}

function TogglePlane(node_this) {
	console.log('TogglePlane');
	Vamp(g['duration']);
	var node_d = d3.select(node_this).datum();
	// node_d.fixed = true;
	if (node_d.planeout===true) {
		RemoveTimePlane(node_this);
		UpdateButton(false, 'TogglePlane');
		if (node_d.menuout===true) {
			ExpandOptionPiece(node_this, 'time');
		}
		else {
			d3.select(node_this).selectAll('.menus.time')
				.call(SetArcDataFromAttr, 'current', 'current')
				.call(SetArcDataFromData, 'max', 'oldmax')
				.style('pointer-events', 'inherit');
		}
	}
	else if (node_d.planeout===false) {
		UpdatePlane(node_this, false);
		node_d.planeout = true;
		UpdateButton(false, 'TogglePlane');
		if (node_d.menuout===true) {
			CollapseOptionPiece(node_this, 'time');
		}
		else {
			d3.select(node_this).selectAll('.menus.time')
				.style('pointer-events', 'none')
				.call(ArcDataMaxReduce);
		}
	}
	// TransitionVamp(g['duration']).each('end', function() {
	// 	node_d.fixed = false;
	// });
}

function ArcDataMaxReduce(selection) {
	selection.each(function(d) {
		d.startAngle_target  = d.startAngle_max + (2/2)*2*Math.PI;
		d.endAngle_target    = d.endAngle_max + (2/2)*2*Math.PI;
		d.innerRadius_target = Radius(1);
		d.outerRadius_target = Radius(1.83);				
	})
	.call(SetArcDataFromData, 'max', 'target');
	return selection;
}

function CollapseOptionPiece(node_this, option, tempease) {
	// console.log('CollapseOptionPiece');
	var selection = d3.select(node_this).selectAll('.menus.'+option)
		// .style('pointer-events', 'none')
		.call(ArcDataMaxReduce);
	selection
		.call(SetArcDataFromAttr, 'current', 'current')
		.transition()
		.ease(g['easemenuin'])
		.duration((tempease !== 'instant') ? g['duration'] : 0)
		.call(BuildArcTween, 'forward');
}

function ExpandOptionPiece(node_this, view) {
	d3.select(node_this).selectAll('.menus.'+view)
		// .style('pointer-events', 'inherit')
		.call(SetArcDataFromAttr, 'current', 'current')
		.call(SetArcDataFromData, 'max', 'oldmax')
		.call(SetArcDataFromData, 'target', 'max')
		.transition()
			.ease(g['easemenuout'])
			.duration(g['duration'])
			.call(BuildArcTween, 'forward');
}

function UpdatePlane(node_this, XorY) {
	var tempXorY;
	if (g['Xviewnew']==='time' && g['Yviewnew']==='time') {
		if (d3.select(node_this).datum().planeout===false) {
			tempXorY = false;
		}
		else {
			tempXorY = XorY;
		}
		if (g['Ysortnew']==='free' && g['Xsortnew']==='free') {
			AddPlanePiece(node_this, 'topright', tempXorY);
			AddPlanePiece(node_this, 'bottomright', tempXorY);
			AddPlanePiece(node_this, 'bottomleft', tempXorY);
			AddPlanePiece(node_this, 'topleft', tempXorY);
		}
		if (g['Ysortnew']==='free' && g['Xsortnew']==='decr') {
			AddPlanePiece(node_this, 'bottomleft', tempXorY);
			AddPlanePiece(node_this, 'topleft', tempXorY);
			RemoveTimePlanePiece(node_this, 'topright', tempXorY);
			RemoveTimePlanePiece(node_this, 'bottomright', tempXorY);
		}
		if (g['Ysortnew']==='free' && g['Xsortnew']==='incr') {
			AddPlanePiece(node_this, 'topright', tempXorY);
			AddPlanePiece(node_this, 'bottomright', tempXorY);
			RemoveTimePlanePiece(node_this, 'bottomleft', tempXorY);
			RemoveTimePlanePiece(node_this, 'topleft', tempXorY);
		}
		if (g['Ysortnew']==='decr' && g['Xsortnew']==='free') {
			AddPlanePiece(node_this, 'bottomright', tempXorY);
			AddPlanePiece(node_this, 'bottomleft', tempXorY);
			RemoveTimePlanePiece(node_this, 'topright', tempXorY);
			RemoveTimePlanePiece(node_this, 'topleft', tempXorY);
		}
		if (g['Ysortnew']==='incr' && g['Xsortnew']==='free') {
			AddPlanePiece(node_this, 'topright', tempXorY);
			AddPlanePiece(node_this, 'topleft', tempXorY);
			RemoveTimePlanePiece(node_this, 'bottomright', tempXorY);
			RemoveTimePlanePiece(node_this, 'bottomleft', tempXorY);
		}
		if (g['Ysortnew']==='decr' && g['Xsortnew']==='decr') {
			AddPlanePiece(node_this, 'bottomleft', tempXorY);
			RemoveTimePlanePiece(node_this, 'topright', tempXorY);
			RemoveTimePlanePiece(node_this, 'bottomright', tempXorY);
			RemoveTimePlanePiece(node_this, 'topleft', tempXorY);
		}
		if (g['Ysortnew']==='decr' && g['Xsortnew']==='incr') {
			AddPlanePiece(node_this, 'bottomright', tempXorY);
			RemoveTimePlanePiece(node_this, 'topright', tempXorY);
			RemoveTimePlanePiece(node_this, 'bottomleft', tempXorY);
			RemoveTimePlanePiece(node_this, 'topleft', tempXorY);
		}
		if (g['Ysortnew']==='incr' && g['Xsortnew']==='decr') {
			AddPlanePiece(node_this, 'topleft', tempXorY);
			RemoveTimePlanePiece(node_this, 'topright', tempXorY);
			RemoveTimePlanePiece(node_this, 'bottomright', tempXorY);
			RemoveTimePlanePiece(node_this, 'bottomleft', tempXorY);
		}
		if (g['Ysortnew']==='incr' && g['Xsortnew']==='incr') {
			AddPlanePiece(node_this, 'topright', tempXorY);
			RemoveTimePlanePiece(node_this, 'bottomright', tempXorY);
			RemoveTimePlanePiece(node_this, 'bottomleft', tempXorY);
			RemoveTimePlanePiece(node_this, 'topleft', tempXorY);
		}
	}
	if (g['Yviewnew']==='time' && g['Xviewnew']!=='time') {
		if (d3.select(node_this).datum().planeout===false) {
			tempXorY = false;
		}
		else {
			tempXorY = XorY;
		}
		if (g['Ysortnew']==='free') {
			AddPlanePiece(node_this, 'topright', tempXorY);
			AddPlanePiece(node_this, 'bottomright', tempXorY);
			AddPlanePiece(node_this, 'bottomleft', tempXorY);
			AddPlanePiece(node_this, 'topleft', tempXorY);
		}
		if (g['Ysortnew']==='decr') {
			AddPlanePiece(node_this, 'bottomright', tempXorY);
			AddPlanePiece(node_this, 'bottomleft', tempXorY);
			RemoveTimePlanePiece(node_this, 'topright', tempXorY);
			RemoveTimePlanePiece(node_this, 'topleft', tempXorY);
		}
		if (g['Ysortnew']==='incr') {
			AddPlanePiece(node_this, 'topright', tempXorY);
			AddPlanePiece(node_this, 'topleft', tempXorY);
			RemoveTimePlanePiece(node_this, 'bottomright', tempXorY);
			RemoveTimePlanePiece(node_this, 'bottomleft', tempXorY);
		}
	}
	if (g['Yviewnew']!=='time' && g['Xviewnew']==='time') {
		if (d3.select(node_this).datum().planeout===false) {
			tempXorY = false;
		}
		else {
			tempXorY = XorY;
		}
		if (g['Xsortnew']==='free') {
			AddPlanePiece(node_this, 'topright', tempXorY);
			AddPlanePiece(node_this, 'bottomright', tempXorY);
			AddPlanePiece(node_this, 'bottomleft', tempXorY);
			AddPlanePiece(node_this, 'topleft', tempXorY);
		}
		if (g['Xsortnew']==='decr') {
			AddPlanePiece(node_this, 'bottomleft', tempXorY);
			AddPlanePiece(node_this, 'topleft', tempXorY);
			RemoveTimePlanePiece(node_this, 'topright', tempXorY);
			RemoveTimePlanePiece(node_this, 'bottomright', tempXorY);
		}
		if (g['Xsortnew']==='incr') {
			AddPlanePiece(node_this, 'topright', tempXorY);
			AddPlanePiece(node_this, 'bottomright', tempXorY);
			RemoveTimePlanePiece(node_this, 'bottomleft', tempXorY);
			RemoveTimePlanePiece(node_this, 'topleft', tempXorY);
		}
	}
	else if (g['Xviewnew']!=='time' && g['Yviewnew']!=='time') {
		if (d3.select(node_this).datum().planeout===false) {
			tempXorY = false;
		}
		else {
			tempXorY = XorY;
		}
		// tempXorY = false;
		AddPlanePiece(node_this, 'topright', tempXorY);
		AddPlanePiece(node_this, 'bottomright', tempXorY);
		AddPlanePiece(node_this, 'bottomleft', tempXorY);
		AddPlanePiece(node_this, 'topleft', tempXorY);
	}
}

// PLANEPIECE
function AddPlanePiece(node_this, quarter, XorY) {
	var temptransform;
	if (XorY==='Y') {
		temptransform = 'scale(1,0)';
	}
	if (XorY==='X') {
		temptransform = 'scale(0,1)';
	}
	var testempty = d3.select(node_this).selectAll('.'+quarter);
	if (testempty.empty()) {
		var plane = d3.select(node_this)
			.insert('svg:path', '.menus.time')
				.datum({})
				.each(function(d) {	d.option = 'time'; })
				.classed('planes', true)
				.classed(quarter, true)
				.classed('time', true)
				.attr('opacity', g['planeopacitynow'])
				.style('pointer-events', g['planepointerevents'])
				.on('mouseover', function() {
					UpdateHelpText('Collapse the time plane');
				})
				.on('click', function(d) {
					var node_this = this.parentNode;
					if (g['vamptime']===0 && g['shiftKey']===false) {
						if (d3.event.defaultPrevented===true) {
							// Nothing
						}
						else {
							TogglePlane(node_this);
						}
					}
				})		
				.each(function(d) {
					var tempfactor = 0.0005;
					var tempfraction = 0.5;
					if (quarter==='topright') {
						d.startAngle_min = (-tempfactor*tempfraction + 0/4)*2*Math.PI;
						d.endAngle_min   = ( tempfactor*tempfraction + 1/4)*2*Math.PI;
					}
					if (quarter==='bottomright') {
						d.startAngle_min = (-tempfactor*tempfraction + 1/4)*2*Math.PI;
						d.endAngle_min   = ( tempfactor*tempfraction + 2/4)*2*Math.PI;
					}
					if (quarter==='bottomleft') {
						d.startAngle_min = (-tempfactor*tempfraction + 2/4)*2*Math.PI;
						d.endAngle_min   = ( tempfactor*tempfraction + 3/4)*2*Math.PI;
					}
					if (quarter==='topleft') {
						d.startAngle_min = (-tempfactor*tempfraction + 3/4)*2*Math.PI;
						d.endAngle_min   = ( tempfactor*tempfraction + 4/4)*2*Math.PI;
					}
					d.innerRadius_min = Radius(1);
					d.outerRadius_min = Radius(1);
					d.startAngle_max  = d.startAngle_min;
					d.endAngle_max    = d.endAngle_min;
					d.innerRadius_max = Radius(1);
					d.outerRadius_max = g['planeradius'];
				})
				.call(SetArcAttrFromData, 'current', 'min');

		var planeborder = d3.select(node_this)
			.insert('svg:path', '.menus.references')
				.datum({})
				.each(function(d) {	d.option = 'time'; })
				.classed('planeborder', true)
				.classed(quarter, true)
				.attr('opacity', g['planeborderopacitynow'])
				.style('pointer-events', g['planepointerevents'])		
				.each(function(d) {
					// var tempfactor = 0.001;
					var tempfactor = 0;
					var tempfraction = 0.45;
					if (quarter==='topright') {
						d.startAngle_min = (-tempfactor*tempfraction + 0/4)*2*Math.PI;
						d.endAngle_min   = ( tempfactor*tempfraction + 1/4)*2*Math.PI;
					}
					if (quarter==='bottomright') {
						d.startAngle_min = (-tempfactor*tempfraction + 1/4)*2*Math.PI;
						d.endAngle_min   = ( tempfactor*tempfraction + 2/4)*2*Math.PI;
					}
					if (quarter==='bottomleft') {
						d.startAngle_min = (-tempfactor*tempfraction + 2/4)*2*Math.PI;
						d.endAngle_min   = ( tempfactor*tempfraction + 3/4)*2*Math.PI;
					}
					if (quarter==='topleft') {
						d.startAngle_min = (-tempfactor*tempfraction + 3/4)*2*Math.PI;
						d.endAngle_min   = ( tempfactor*tempfraction + 4/4)*2*Math.PI;
					}
					d.innerRadius_min = Radius(1);
					d.outerRadius_min = Radius(1);
					d.startAngle_max  = d.startAngle_min;
					d.endAngle_max    = d.endAngle_min;
					d.innerRadius_max = g['planeradius'] - 2;
					d.outerRadius_max = g['planeradius'];
				})
				.call(SetArcAttrFromData, 'current', 'min');
		
		// if (XorY===false) {
		// 	plane
		// 		.call(SetArcDataFromAttr, 'current', 'current')
		// 		.call(SetArcDataFromData, 'target', 'max')
		// 		.transition()
		// 			.ease(g['easeplaneadd'])
		// 			.duration(g['duration'])
		// 			.call(BuildArcTween, 'forward');
		// 	planeborder
		// 		.call(SetArcDataFromAttr, 'current', 'current')
		// 		.call(SetArcDataFromData, 'target', 'max')
		// 		.transition()
		// 			.ease(g['easeplaneadd'])
		// 			.duration(g['duration'])
		// 			.call(BuildArcTween, 'forward');
		// }
		if (XorY===false) {
			plane
				.call(SetArcInstantly, 'max')
				.attr('transform', 'scale(0,0)')
				.transition()
					.ease(g['easeplaneadd'])
					.duration(g['duration'])
					.attr('transform', 'scale(1,1)');
			planeborder
				.call(SetArcInstantly, 'max')
				.attr('transform', 'scale(0,0)')
				.transition()
					.ease(g['easeplaneadd'])
					.duration(g['duration'])
					.attr('transform', 'scale(1,1)');
		}
		else {
			plane
				.call(SetArcInstantly, 'max')
				.attr('transform', temptransform)
				.transition()
					.ease(g['easeplaneadd'])
					.duration(g['duration'])
					.attr('transform', 'scale(1,1)');
			planeborder
				.call(SetArcInstantly, 'max')
				.attr('transform', temptransform)
				.transition()
					.ease(g['easeplaneadd'])
					.duration(g['duration'])
					.attr('transform', 'scale(1,1)');
		}
	}
}

function SetArcInstantly(selection, target) {
	selection
		.attr('d', function(d) {
			return d3.svg.arc()
				.innerRadius(d['innerRadius_'+target])
				.outerRadius(d['outerRadius_'+target])
				.startAngle(d['startAngle_'+target])
				.endAngle(d['endAngle_'+target])();
		})
		.call(SetArcAttrFromData, 'current', target);
}

function RemoveTimePlanePiece(node_this, quarter, XorY) {
	var plane = d3.select(node_this).selectAll('.'+quarter);
	var temptransform;
	if (XorY==='Y') {
		temptransform = 'scale(1,0)';
	}
	if (XorY==='X') {
		temptransform = 'scale(0,1)';
	}
	// if (XorY===false) {
	// 	plane
	// 		.call(SetArcDataFromAttr, 'current', 'current')
	// 		.call(SetArcDataFromData, 'target', 'min')
	// 		.transition()
	// 			.ease(g['easeflipout'])
	// 			.duration(g['duration']*2/2)
	// 			// .delay(g['duration']*1/2)
	// 			.call(BuildArcTween, 'forward')
	// 			.each('end', function() {
	// 				d3.select(this).remove();
	// 			});
	// }
	if (XorY===false) {
		plane
			.attr('transform', 'scale(1,1)')
			.transition()
				.ease(g['easeplaneremove'])
				.duration(g['duration'])
				.attr('transform', 'scale(0,0)')
				.each('end', function() {
					d3.select(this).remove();
				});
	}
	else {
		plane
			.attr('transform', 'scale(1,1)')
			.transition()
				.ease(g['easeplaneremove'])
				.duration(g['duration'])
				.attr('transform', temptransform)
				.each('end', function() {
					d3.select(this).remove();
				});
	}
}

function ToggleMenu(node_this) {
	UpdateButton(false, 'ToggleMenu');
	Vamp(g['duration']);
	var tempvalue, tempmenuout, temppointerevents, tempopacity, endfixed;
	var node_d = d3.select(node_this).datum();
	node_d.fixed = true;
	if (node_d.menuout===false) {
		tempvalue = 'max';
		endfixed = true;
		tempmenuout = true;
		temppointerevents = 'inherit';
		tempopacity = 1;
		// Collapse any reference or citing planes with 0 values
		if (node_d.referencing === 0) {
			node_d.referencesout = true;
			CollapseOptionPiece(node_this, 'references', 'instant');	
		}
		if (node_d.citedby <= 1) {
			node_d.citingout = true;
			CollapseOptionPiece(node_this, 'citing', 'instant');	
		}
	}
	else if (node_d.menuout===true) {
		tempvalue = 'min';
		endfixed = false;
		tempmenuout = false;
		temppointerevents = 'none';
		tempopacity = 0;
	}
	for (var i=0; i<menuoptions.length; i++) {
		d3.select(node_this).selectAll('.menus.'+menuoptions[i].option)
			.call(SetArcDataFromAttr, 'current', 'current')
			.call(SetArcDataFromData, 'target', tempvalue)
			.style('pointer-events', temppointerevents)
			.style('opacity', 1)
			.transition()
				.ease(g['easemenuin'])
				.duration(g['duration'])
				.call(BuildArcTween, 'forward')
				.call(EndAll, function() {
					node_d.fixed = endfixed;
					node_d.menuout = tempmenuout;
					d3.select(node_this).selectAll('.menus')
						.style('opacity', tempopacity);
				});
	}
}

function DebugLayout() {
	var x, y;
	for (x=-1; x<g['wnum']+1; x++) {
		for (y=-1; y<g['hnum']+1; y++) {
			// sides.append('circle')
			// 	.attr('cx', LayoutX(x))
			// 	.attr('cy', LayoutY(y))
			// 	.attr('r', 2)
			// 	.attr('fill', 'green');
			sides.append('circle')
				.attr('cx', LayoutX(x+0.5))
				.attr('cy', LayoutY(y+0.5))
				.attr('r', 2)
				.attr('fill', 'red');
		}
	}
	var markerdata = [
		{
			x: (-1)*g['sidesleft'] + (0)*g['stagewidth'] + (0)*g['sidesright'],
			y: (-1)*g['sidestop'] + (0)*g['stageheight'] + (0)*g['sidesbottom']
		},
		{
			x: (0)*g['sidesleft'] + (1)*g['stagewidth'] + (1)*g['sidesright'],
			y: (-1)*g['sidestop'] + (0)*g['stageheight'] + (0)*g['sidesbottom']
		},
		{
			x: (0)*g['sidesleft'] + (0)*g['stagewidth'] + (0)*g['sidesright'],
			y: (0)*g['sidestop'] + (0)*g['stageheight'] + (0)*g['sidesbottom']
		},
		{
			x: (0)*g['sidesleft'] + (1)*g['stagewidth'] + (0)*g['sidesright'],
			y: (0)*g['sidestop'] + (0)*g['stageheight'] + (0)*g['sidesbottom']
		},
		{
			x: (0)*g['sidesleft'] + (0)*g['stagewidth'] + (0)*g['sidesright'],
			y: (0)*g['sidestop'] + (1)*g['stageheight'] + (0)*g['sidesbottom']
		},
		{
			x: (0)*g['sidesleft'] + (1)*g['stagewidth'] + (0)*g['sidesright'],
			y: (0)*g['sidestop'] + (1)*g['stageheight'] + (0)*g['sidesbottom']
		},
		{
			x: (-1)*g['sidesleft'] + (0)*g['stagewidth'] + (0)*g['sidesright'],
			y: (0)*g['sidestop'] + (1)*g['stageheight'] + (1)*g['sidesbottom']
		},
		{
			x: (0)*g['sidesleft'] + (1)*g['stagewidth'] + (1)*g['sidesright'],
			y: (0)*g['sidestop'] + (1)*g['stageheight'] + (1)*g['sidesbottom']
		},
	];
	sides.selectAll('.markercircle')
		.data(markerdata)
		.enter()
		.append('circle')
			.attr('cx', function(d) { return d.x; })
			.attr('cy', function(d) { return d.y; })
			.attr('r', 4)
			.attr('fill', 'purple');
}

function DebugAnimation() {
	var tempopacity;
	if (g['debuganimation']===true) {
		tempopacity = 1;
	}
	else {
		tempopacity = 0;
	}
	vampclock = sides.append('text')
		.classed('vampclock', true)
		.attr('transform', 'translate('+LayoutX(0)+','+LayoutY(g['hnum']-3)+')')
		.attr('x', -0.5*g['iconpad'])
		.text(parseFloat(g['vamptime']).toFixed(0))
		.style('opacity', tempopacity);
	transitionvampclock = sides.append('text')
		.classed('transitionvampclock', true)
		.attr('transform', 'translate('+LayoutX(0)+','+LayoutY(g['hnum']-4)+')')
		.attr('x', -0.5*g['iconpad'])
		.text(0)
		.style('opacity', tempopacity);
	vamprect = sides.append('rect')
		.classed('vamprect', true)
		.attr('transform', 'translate('+LayoutX(0)+','+LayoutY(g['hnum']-1)+')')
		.attr('x', (-1/1)*g['iconsize'])
		.attr('y', (1/2)*g['iconsize'])
		.attr('width', (1/1)*g['iconsize'])
		.attr('height', (1/1)*g['iconsize'])
		.attr('fill', g['vamptime']===0 ? 'green' : 'red')
		.style('opacity', tempopacity);
}

function DebugForce() {
	var i;
	var tempy = 0;
	body.append('br');
	var forcedebugContainer = body.append('div').attr('id', 'forcedebug-container')
		.style('margin-left', g['sidesleft']+'px');
	for (i=0; i<9; i++) {
		forcedebugdivs[i] = forcedebugContainer.append('div')
			.classed('forcedebugdiv', true);
		forcedebugContainer.append('br');
	}
	BuildDebugSlider(0, 'linkDistance',   0, 1000);
	BuildDebugSlider(1, 'linkStrength',   0, 1);
	BuildDebugSlider(2, 'friction',       0, 1);
	BuildDebugSlider(3, 'charge',         -2000, 0);
	BuildDebugSlider(4, 'chargeDistance', 0, 2000);
	BuildDebugSlider(5, 'theta',          0, 10);
	BuildDebugSlider(6, 'gravity',        0, 1);
	BuildDebugSlider(7, 'node_r',         0, 100);
	BuildDebugSlider(8, 'duration',       0, 5000);
}

function LayoutFractionFromFontSize(fontsize) {
	var newlayoutfraction;
	newlayoutfraction = fontsize*(1/4)*(1/(0.5*g['iconsize']-g['iconpad']));
	return newlayoutfraction;
}

function FontSizeFromString(string, wunits, tempfontfamily) {
	var tempfontsize = 2.0;
	var templabel = sides.append('text');
	templabel.style('font-size', tempfontsize)
		.style('font-family', tempfontfamily)
		.style('font-size', tempfontsize)
		.text(string);
	// console.log(templabel[0][0].getBBox().width, templabel[0][0].getBBox().height, templabel.style('width'), templabel.style('height'));
	var tempwidth = parseFloat(templabel.style('width').slice(0,-2)); // px
	var newfontsize = (wunits*g['unitsquare']-2*g['iconpad']) * (tempfontsize/tempwidth);
	templabel.remove();
	return newfontsize;
}

function FontSizeFromLayoutFraction(layoutfraction) {
	var newfontsize;
	newfontsize = (0.5*g['iconsize']-g['iconpad'])*(4)*(layoutfraction);
	return newfontsize;
}

function MouseWheel(XorY, passedevent) {
	var browserconstant, browserfactor, browsersign, browserdelta;
	if (g['vamptime']===0) {
		if (g['browserisChrome']===true) {
			browserconstant = 100;
			browserfactor = 2;
			browsersign = 1;
			browserdelta = passedevent.deltaY;
		}
		else if (g['browserisFirefox']===true) {
			browserconstant = 0;
			browserfactor = 15;
			browsersign = 1;
			browserdelta = passedevent.deltaY;
		}
		else if (g['browserisSafari']===true) {
			browserconstant = 10;
			browserfactor = 2;
			browsersign = -1;
			browserdelta = passedevent.wheelDeltaY;
		}
		if (browserdelta<0) {
			browserdelta = -1*browserconstant*browserfactor + browserdelta;
		}
		else if (browserdelta>0) {
			browserdelta = 1*browserconstant*browserfactor + browserdelta;
		}
		var zoomdelta = browsersign*browserfactor*browserdelta/4000.0;
		if (g[XorY+'zoom']+zoomdelta<=1) {
			g[XorY+'zoom'] = 1;
		}
		else if (g[XorY+'zoom']+zoomdelta>=2) {
			g[XorY+'zoom'] = 2;
		}
		else {
			g[XorY+'zoom'] += zoomdelta;
		}
		FixZoomOffset(XorY);
		// console.log(passedevent.deltaY, zoomdelta);
	}
}

function FixZoomOffset(XorY) {
	d3.selectAll('.blit'+XorY).remove();
	GenerateScales(XorY);
	TransformAxesObjectsCollection('axeslabels', XorY, g[XorY+'sortnew'], 'instant');
	TransformAxesObjectsCollection('axesgridlines', XorY, g[XorY+'sortnew'], 'instant');
	if (g['node_this']!==false) {
		BuildAxesObjectCollection('axesticks', g['node_d']);
		if (showYAxis === true) {
			if (g['Ysortnew']==='incr') {
				TransformAxesObjectsCollection('axesticks', 'Y', 'incr', 'instant');
			} 
			if (g['Ysortnew']==='decr') {
				TransformAxesObjectsCollection('axesticks', 'Y', 'decr', 'instant');
			}
		}
		if (showXAxis === true) {
			if (g['Xsortnew']==='incr') {
				TransformAxesObjectsCollection('axesticks', 'X', 'incr', 'instant');
			}
			if (g['Xsortnew']==='decr') {
				TransformAxesObjectsCollection('axesticks', 'X', 'decr', 'instant');
			}
		}
	}
	var initnodex = GetNodeValue('newx');
	var initnodey = GetNodeValue('newy');
	Tick();
	var finalnodex = GetNodeValue('newx');
	var finalnodey = GetNodeValue('newy');
	g['nodediffx'] = finalnodex - initnodex;
	g['nodediffy'] = finalnodey - initnodey;
	DragStage(-g['nodediffx'], -g['nodediffy']);
}

function GetNodeValue(value) {
	if (g['node_this']===false) {
		var mean = d3.mean(nodes[0], function(node) {
			return d3.select(node).datum()[value];
		});
		return mean;
	}
	else {
		var node_this = g['node_this'];
		var node_d = g['node_d'];		
		return node_d[value];
	}
}

function DragStage(dragx, dragy) {
	if (g['vamptime']===0) {
		var dx, dy;

		var newx = g['stagerootx'] + dragx;
		if (newx < (-0.5)*g['stagewidth']) {
			newx = (-0.5)*g['stagewidth'];
		} else if (newx > (0.5)*g['stagewidth']) {
			newx = 0.5*g['stagewidth'];
		}
		g['stagerootx'] = newx;
		g['Xrootx'] = g['stagerootx'];
		d3.select('.stagerootx')
			.attr('transform', 'translate('+g['stagerootx']+',0)');
		d3.selectAll('.Xrooty')
			.attr('transform', 'translate('+g['Xrootx']+',0)');

		var newy = g['stagerooty'] + dragy;
		// if (newy < (-0.5)*g['stageheight']) {
		// 	newy = (-0.5)*g['stageheight'];
		// } else if (newy > (0.5)*g['stageheight']) {
		// 	newy = 0.5*g['stageheight'];
		// }
		g['stagerooty'] = newy;
		g['Yrooty'] = g['stagerooty'];
		d3.select('.stagerooty')
			.attr('transform', 'translate(0,'+g['stagerooty']+')');
		d3.selectAll('.Yrooty')
			.attr('transform', 'translate(0,'+g['Yrooty']+')');

		// force.start();
		if (g['node_this']!==false) {
			BuildExaminerDiv(g['node_this']);
		}
	}
}

function TransitionDragStage(dragx, dragy) {
	var testx = g['stagerootx'] + dragx;
	var testy = g['stagerooty'] + dragy;
	g['stagerootx'] += dragx;
	g['Xrootx'] += dragx;
	g['stagerooty'] += dragy;
	g['Yrooty'] += dragy;
	var tempdelay = 0;
	d3.select('.stagerootx')
		.transition()
		.ease(g['easedragstage'])
		.delay(tempdelay)
		.duration(g['durationtranslate'])
		.attr('transform', 'translate('+g['stagerootx']+',0)');
	d3.select('.stagerooty')
		.transition()
		.ease(g['easedragstage'])
		.delay(tempdelay)
		.duration(g['durationtranslate'])
		.attr('transform', 'translate(0,'+g['stagerooty']+')');
	d3.selectAll('.Xrooty')
		.transition()
		.ease(g['easedragstage'])
		.delay(tempdelay)
		.duration(g['durationtranslate'])
		.attr('transform', 'translate('+g['Xrootx']+',0)');
	d3.selectAll('.Yrooty')
		.transition()
		.ease(g['easedragstage'])
		.delay(tempdelay)
		.duration(g['durationtranslate'])
		.attr('transform', 'translate(0,'+g['Yrooty']+')');
}

function TransformView(XorY, viewchange) {
	var i;
	Vamp(g['durationtranslate']);
	var temptransform, temptransform2;
	if (XorY==='Y') {
		temptransform = 'scale(1,0)';
		temptransform2 = 'scale(0,1)';
	}
	if (XorY==='X') {
		temptransform = 'scale(0,1)';
		temptransform2 = 'scale(1,0)';
	}
	// Set tempease fallback situation
	var tempease = g['easeflipout'];
	var tempduration = g['durationtranslate'];
	force.stop();
	// Fix offset of stage so node is centered
	var initnodex = GetNodeValue('newx');
	var initnodey = GetNodeValue('newy');

	if (viewchange==='viewchange') {
		// Nothing
	}
	else {
		if (g[XorY+'sortold']==='free' && g[XorY+'sortnew']==='decr') {
			tempease = g['easeflipout'];
			TransformAxesObjectsCollection('axeslabels', XorY, 'decr', 'instant');
			TransformAxesObjectsCollection('axesgridlines', XorY, 'decr', 'instant');
			TransformAxesObjectsCollection('axesticks', XorY, 'decr', 'instant');
			axes[g[XorY+'viewnew']][XorY].attr('transform', temptransform);
			axes[g[XorY+'viewnew']][XorY].transition()
				.ease(tempease)
				.duration(tempduration)
				// .delay(tempduration)
				.attr('transform', 'scale(1,1)');
			g[XorY+'isout'] = true;
		}
		if (g[XorY+'sortold']==='free' && g[XorY+'sortnew']==='incr') {
			tempease = g['easeflipout'];
			TransformAxesObjectsCollection('axeslabels', XorY, 'incr', 'instant');
			TransformAxesObjectsCollection('axesgridlines', XorY, 'incr', 'instant');
			TransformAxesObjectsCollection('axesticks', XorY, 'incr', 'instant');
			axes[g[XorY+'viewnew']][XorY].attr('transform', temptransform);
			axes[g[XorY+'viewnew']][XorY].transition()
				.ease(tempease)
				.duration(tempduration)
				// .delay(tempduration)
				.attr('transform', 'scale(1,1)');
			g[XorY+'isout'] = true;
		}
		if (g[XorY+'sortold']==='decr' && g[XorY+'sortnew']==='free') {
			tempease = g['easeflipout'];
			// TransformAxesObjectsCollection('axeslabels', XorY, 'free', tempease);// 
			// TransformAxesObjectsCollection('agridlinesels', XorY, 'free', tempease);// 
			axes[g[XorY+'viewnew']][XorY].transition()
				.ease(tempease)
				.duration(tempduration)
				.attr('transform', temptransform);
			g[XorY+'isout'] = false;
		}
		if (g[XorY+'sortold']==='incr' && g[XorY+'sortnew']==='free') {
			tempease = g['easeflipout'];
			// TransformAxesObjectsCollection('axeslabels', XorY, 'free', tempease);// 
			// TransformAxesObjectsCollection('agridlinesels', XorY, 'free', tempease);// 
			axes[g[XorY+'viewnew']][XorY].transition()
				.ease(tempease)
				.duration(tempduration)
				.attr('transform', temptransform);
			g[XorY+'isout'] = false;
		}
		if (g[XorY+'sortold']==='decr' && g[XorY+'sortnew']==='incr') {
			tempease = g['easeflipinout'];
			TransformAxesObjectsCollection('axeslabels', XorY, 'incr', tempease);
			TransformAxesObjectsCollection('axesgridlines', XorY, 'incr', tempease);
			TransformAxesObjectsCollection('axesticks', XorY, 'incr', tempease);
			g[XorY+'isout'] = true;
		}
		if (g[XorY+'sortold']==='incr' && g[XorY+'sortnew']==='decr') {
			tempease = g['easeflipinout'];
			TransformAxesObjectsCollection('axeslabels', XorY, 'decr', tempease);
			TransformAxesObjectsCollection('axesgridlines', XorY, 'decr', tempease);
			TransformAxesObjectsCollection('axesticks', XorY, 'decr', tempease);
			g[XorY+'isout'] = true;
		}
	}
	TransformNodes(nodes, tempease, XorY);		
	TransformLinkcovers(tempease, XorY);
	TransformLinks(links, tempease, XorY);
	for (i=0; i<nodes[0].length; i++) {
		var node_this = nodes[0][i];
		// console.log('i = ', i, ' /', nodes[0].length);
		var node_d = d3.select(node_this).datum();
		if (node_d.planeout===true) {
			UpdatePlane(node_this, XorY);
		}
	}
	var finalnodex = GetNodeValue('newx');
	var finalnodey = GetNodeValue('newy');
	g['nodediffx'] = finalnodex - initnodex;
	g['nodediffy'] = finalnodey - initnodey;
	TransitionDragStage(-g['nodediffx'], -g['nodediffy']);
	// This might be causing memory issues
	TransitionVamp(g['durationtranslate']).each('end', function() {
	// 	if (g['vamptime']===0) {
		requestAnimationFrame(force.start);
	// 	}
	});
}

function BuildAdditionalText() {
	var creditsDiv = body.append('div')
		.attr('id', 'credits-container');
	var textData = [
		{
			text: 'Constellation',
			href: false,
			size: 'large'
		},
		{
			text: 'arxiv.org explorer',
			href: false,
			size: 'medium',
		},
		// {
		// 	text: 'github.com/tomswisher',
		// 	href: 'https://github.com/tomswisher/',
		// 	size: 'medium'
		// },
		// {
		// 	text: 'bl.ocks.org/tomswisher',
		// 	href: 'http://bl.ocks.org/tomswisher',
		// 	size: 'medium'
		// },
	];
	creditsDiv.selectAll('a.credits-text').data(textData).enter()
		.append('div').classed('credits-row', true)
			.each(function(d) {
				d3.select(this).classed(d.size, true); // .classed() will not accept a function(d)
			})
			.append('a').classed('credits-text', true)
				.text(function(d) { return d.text; })
				.attr('target', '_blank')
				.attr('href', function(d) { return d.href===false ? null : d.href; });
}

//--------------------------------------------------------------------------------------
// This was the function from 2014. I rewrote it above ^^^. I'm leaving it as a reminder
//--------------------------------------------------------------------------------------
// function BuildAdditionalText() {
// 	var shifty = 0.5;
// 	var numtitles = 7;
// 	var tempfontfamily = d3.range(numtitles);
// 	var tempbaseline = d3.range(numtitles);
// 	var temptext = d3.range(numtitles);
// 	var tempfontsize = d3.range(numtitles);
// 	var layoutfraction = d3.range(numtitles);
// 	var tempx = d3.range(numtitles);
// 	var tempy = d3.range(numtitles);
// 	var tempanchor = d3.range(numtitles);
// 	var temphref = d3.range(numtitles);
// 	var temppointerevents = d3.range(numtitles);
// 	var tempfill = d3.range(numtitles);
// 	var i;
// 	for (i=0; i<numtitles; i++) {
// 		tempfontfamily[i] = 'Arial';
// 		tempbaseline[i] = 'central';
// 		tempfontsize[i] = g['font-size'];
// 		layoutfraction[i] = LayoutFractionFromFontSize(tempfontsize[i]);
// 		tempx[i] = LayoutX(1);
// 		tempanchor[i] = 'middle';
// 		temphref[i] = 'javascript:void(0);';
// 		temppointerevents[i] = 'none';
// 		tempfill[i] = 'black';
// 	}
// 	// SPECIFIC LABELS
// 	temptext[0] = 'Constellation';
// 	temptext[1] = '';
// 	temptext[2] = 'github.com/tomswisher';
// 	temptext[3] = '';
// 	temptext[4] = '';
// 	temptext[5] = 'Y Axis perspective is:';
// 	temptext[6] = 'X Axis perspective is:';
// 	temphref[0] = 'http://bl.ocks.org/tomswisher/58e0ac7cd6da86e391a1'
// 	temphref[2] = 'https://github.com/tomswisher/'
// 	temppointerevents[2] = 'inherit';
// 	tempfill[2] = '#0783B6';
// 	tempx[2] = LayoutX(1.25);
// 	// Non-Chrome browsers
// 	if (g['browserisFirefox']===true) { // Firefox width issue
// 		tempfontsize[0] = 29.18918918918919;
// 		layoutfraction[0] = 0.3171171171171171;
// 		// tempfontsize[2] = 12.690951821386603;
// 		// layoutfraction[2] = 0.1378770074422248;
// 	}
// 	else {
// 		tempfontsize[0] = FontSizeFromString(temptext[0], 3.125, tempfontfamily);
// 		layoutfraction[0] = LayoutFractionFromFontSize(tempfontsize[0]);
// 		// tempfontsize[2] = FontSizeFromString(temptext[2], 2.875, tempfontfamily);
// 		// layoutfraction[2] = LayoutFractionFromFontSize(tempfontsize[2]);
// 	}
// 	tempfontsize[4] = 12;
// 	tempy[0] = LayoutY(shifty + g['hnum']-1 - layoutfraction[0]);
// 	tempy[2] = LayoutY(shifty + g['hnum']-1.75 - layoutfraction[2]);
// 	tempy[3] = LayoutY(shifty + g['hnum']-2.1 - layoutfraction[2]);
// 	tempy[4] = LayoutY(shifty + g['hnum']-4.5);
// 	tempy[5] = LayoutY(shifty + g['hnum']-8 + layoutfraction[5]);
// 	tempy[6] = LayoutY(shifty + g['hnum']-10.5 + layoutfraction[6]);
// 	tempx[4] = LayoutX(g['wnum']-0.65);
// 	for (i=0; i<numtitles; i++) {
// 		// console.log(tempfontsize[i], layoutfraction[i]);
// 		sides.append('svg:a')
// 			.attr('transform', 'translate('+tempx[i]+','+tempy[i]+')')
// 			.style('pointer-events', temppointerevents[i])
// 				.attr('xlink:href', temphref[i])
// 				.attr('target', '_blank')
// 				.append('text')
// 					.style('text-anchor', tempanchor[i])
// 					.style('dominant-baseline', tempbaseline[i])
// 					.style('font-size', tempfontsize[i] + 'px')
// 					.style('font-family', tempfontfamily[i])
// 					.style('fill', tempfill[i])
// 					.text(temptext[i]);
// 	}
// }
//-----------------------------------------------------------------------------------------------

function SetArcAttrFromData(selection, target, source) {
	selection
		.attr('startAngle_' +target, function(d) { return d['startAngle_' +source]; })
		.attr('endAngle_'   +target, function(d) { return d['endAngle_'   +source]; })
		.attr('innerRadius_'+target, function(d) { return d['innerRadius_'+source]; })
		.attr('outerRadius_'+target, function(d) { return d['outerRadius_'+source]; });
}

function SetArcDataFromAttr(selection, target, source) {
	selection.each(function(d) {
		d['startAngle_' +target] = parseFloat(d3.select(this).attr('startAngle_' +source));
		d['endAngle_'   +target] = parseFloat(d3.select(this).attr('endAngle_'   +source));
		d['innerRadius_'+target] = parseFloat(d3.select(this).attr('innerRadius_'+source));
		d['outerRadius_'+target] = parseFloat(d3.select(this).attr('outerRadius_'+source));
	});
}

function SetArcDataFromData(selection, target, source) {
	selection.each(function(d) {
		d['startAngle_' +target] = d['startAngle_' +source];
		d['endAngle_'   +target] = d['endAngle_'   +source];
		d['innerRadius_'+target] = d['innerRadius_'+source];
		d['outerRadius_'+target] = d['outerRadius_'+source];
	});
}

function BuildArcTween(transition, direction) {
	var TimeFunction;
	switch (direction) {
		case 'forward':
			TimeFunction = function(t) { return t; };
			break;
		case 'reverse':
			TimeFunction = function(t) { return 1-t; };
			break;
	}
	transition
		.attrTween('d', function(d) {
			return function(t) {
				d.startAngle  = d3.interpolate(d.startAngle_current,  d.startAngle_target)( TimeFunction(t) );
				d.endAngle    = d3.interpolate(d.endAngle_current,    d.endAngle_target)( TimeFunction(t) );
				d.innerRadius = d3.interpolate(d.innerRadius_current, d.innerRadius_target)( TimeFunction(t) );
				d.outerRadius = d3.interpolate(d.outerRadius_current, d.outerRadius_target)( TimeFunction(t) );
				return d3.svg.arc()(d);
			};
		})
		.call(SetArcAttrFromData, 'current', 'target');
}

function BuildIcon(selection, icon, XorY) {
	var trianglewidth, triangleheight, offset, circleradius;
	if (icon==='ToggleExaminer') {
		selection.call(DrawIconBase, 'notselected');
		selection.append('rect').classed('symbol', true)
			.attr('x', (-0.5/12)*g['iconsize'])
			.attr('y', (1/12)*g['iconsize'])
			.attr('width', (1/12)*g['iconsize'])
			.attr('height', (3.9/12)*g['iconsize']);
		selection.append('circle').classed('symbol', true)
			.classed('inverted', true)
			.attr('cx', 0)
			.attr('cy', (-1.25/12)*g['iconsize'])
			.attr('r', (3.95/12)*g['iconsize']);
		// selection.append('circle').classed('symbol', true)
		// 	.classed('inverted', true)
		// 	.attr('cx', 0)
		// 	.attr('cy', (-1.25/12)*g['iconsize'])
		// 	.attr('r', (2.85/12)*g['iconsize']);
		selection.call(DrawSymbolNode, 'selected');
	}
	else if (icon==='ToggleMenu') {
		selection.call(DrawIconBase, 'selected');
		selection.call(DrawSymbolArc, 'time');
		selection.call(DrawSymbolArc, 'references');
		selection.call(DrawSymbolArc, 'citing');
		// selection.call(DrawSymbolArc, 'hide');
		selection.call(DrawSymbolNode, 'selected');
	}
	else if (icon==='TogglePlane') {
		selection.call(DrawIconBase, 'selected');
		selection.call(DrawSymbolArc, 'time');
		selection.call(DrawSymbolNode, 'selected');
	}
	else if (icon==='LoadReferences') {
		selection.call(DrawIconBase, 'selected');
		selection.call(DrawSymbolArc, 'references');
		selection.call(DrawSymbolNode, 'selected');
	}
	else if (icon==='LoadCiting') {
		selection.call(DrawIconBase, 'selected');
		selection.call(DrawSymbolArc, 'citing');
		selection.call(DrawSymbolNode, 'selected');
	}
	else if (icon==='free') {
		selection.call(DrawIconBase, 'notselected');
		selection.append('rect')
			.classed('symbol', true)
			.attr('x', (-1.75/8)*g['iconsize'])
			.attr('y', (-1.75/8)*g['iconsize'])
			.attr('width', (3.5/8)*g['iconsize'])
			.attr('height', (3.5/8)*g['iconsize']);
	}
	else if (icon==='triangledecr') {
		selection.call(DrawIconBase, 'notselected');
		trianglewidth = (1/2)*g['iconsize'];
		triangleheight = (Math.sqrt(3)/2)*trianglewidth;
		offset = (1/2)*trianglewidth*Math.tan((1/12)*2*Math.PI);
		selection.append('polygon')
			.classed('symbol', true)
			.attr('points', function() {
				return '0'+','+(-triangleheight+offset)+' '+(1/2)*trianglewidth+','+offset+' '+(-1/2)*trianglewidth+','+offset;
			});	
		if (XorY==='Y') {
			selection.attr('transform', 'rotate(180)');
		}
		if (XorY==='X') {
			selection.attr('transform', 'rotate(-90)');
		}
	}
	else if (icon==='triangleincr') {
		selection.call(DrawIconBase, 'notselected');
		trianglewidth = (1/2)*g['iconsize'];
		triangleheight = (Math.sqrt(3)/2)*trianglewidth;
		offset = (1/2)*trianglewidth*Math.tan((1/12)*2*Math.PI);
		selection.append('polygon')
			.classed('symbol', true)
			.attr('points', function() {
				return '0' + ',' + (-triangleheight + offset)+ ' ' +(1/2)*trianglewidth + ',' + offset+ ' ' +(-1/2)*trianglewidth + ',' + offset;
			});	
		if (XorY==='Y') {
			selection.attr('transform', 'rotate(0)');
		}
		if (XorY==='X') {
			selection.attr('transform', 'rotate(90)');
		}
	}
	else if (icon==='GoDeeperReferences' || icon==='GoDeeperCiting' || icon==='GoDeeperPlane') {
		if (icon==='GoDeeperReferences') { option = 'references'; }
		if (icon==='GoDeeperCiting')     { option = 'citing'; }
		if (icon==='GoDeeperPlane')      { option = 'time'; }
		selection.call(DrawIconBase, 'notselected');
		trianglewidth = (6.25/12)*g['iconsize'];
		triangleheight = (Math.sqrt(3)/2)*trianglewidth;
		offset = (1/2)*trianglewidth*Math.tan((1/12)*2*Math.PI);
		circleradius = (3/24)*g['iconsize'];
		selection.append('line').classed('symbol', true)
			.attr('x1', 0)
			.attr('y1', 0)
			.attr('x2', 0)
			.attr('y2', -triangleheight + offset)
			.classed(option, true);
		selection.append('line').classed('symbol', true)
			.attr('x1', 0)
			.attr('y1', 0)
			.attr('x2', (1/2)*trianglewidth)
			.attr('y2', offset)
			.classed(option, true);
		selection.append('line').classed('symbol', true)
			.attr('x1', 0)
			.attr('y1', 0)
			.attr('x2', (-1/2)*trianglewidth)
			.attr('y2', offset)
			.classed(option, true);
		selection.append('circle').classed('symbol', true)
			.attr('cx', 0)
			.attr('cy', -triangleheight + offset)
			.attr('r', circleradius)
			.classed(option, true);
		selection.append('circle').classed('symbol', true)
			.attr('cx', (1/2)*trianglewidth)
			.attr('cy', offset)
			.attr('r', circleradius)
			.classed(option, true);
		selection.append('circle').classed('symbol', true)
			.attr('cx', (-1/2)*trianglewidth)
			.attr('cy', offset)
			.attr('r', circleradius)
			.classed(option, true);
		selection.call(DrawSymbolNode, 'notselected');
	}
} 

function DrawCollapsedButton(xindex, yindex, XorY) {
	var tempx1, tempx2, tempy1, tempy2;
	var hangfactor = 0.5;
	if (XorY==='Y') {
		tempx1 = LayoutX(xindex) + (-1/2)*g['iconsize'] - hangfactor;
		tempx2 = LayoutX(xindex) + (1/2)*g['iconsize'] + hangfactor;
		tempy1 = LayoutY(yindex) + 0;
		tempy2 = LayoutY(yindex) + 0;
	}
	else if (XorY==='X') {
		tempx1 = LayoutX(xindex) + 0;
		tempx2 = LayoutX(xindex) + 0;
		tempy1 = LayoutY(yindex) + (-1/2)*g['iconsize'] - hangfactor;
		tempy2 = LayoutY(yindex) + (1/2)*g['iconsize'] + hangfactor;
	}
	sides.append('line')
		.classed('collapsed', true)
		.attr('x1', tempx1)
		.attr('x2', tempx2)
		.attr('y1', tempy1)
		.attr('y2', tempy2);
}

function DrawSymbolArc(selection, option) {
	var tempstartangle = 2*Math.PI*(g['angleinitial']+g['angle'+option]+0);
	var tempendangle   = 2*Math.PI*(g['angleinitial']+g['angle'+option]+0+g['anglewidth']);
	selection.append('svg:path')
		.classed('symbol', true)
		.classed(option, true)
		.attr('d', d3.svg.arc()
			.innerRadius(0)
			.outerRadius((5/12)*g['iconsize'])
			.startAngle(tempstartangle)
			.endAngle(tempendangle)
		);
	return selection;
}

function DrawSymbolNode(selection, option) {
	selection.append('circle')
		.classed('symbol', true)
		.classed(option, true)
		.attr('cx', 0)
		.attr('cy', 0)
		.attr('r', (3/24)*g['iconsize']);
	return selection;
}

function DrawIconBase(selection, option) {
	selection.append('circle')
		.classed('iconbase', true)
		// .classed(option, true)
		// .classed('notselected', true)
		.attr('cx', 0)
		.attr('cy', 0)
		.attr('r', (1/2)*g['iconsize']);
	return selection;
}

function UpdateDurations() {
	g['durationlink']      = g['duration']*1;
	g['durationnode']      = g['duration']*1;
	g['durationtranslate'] = g['duration']*2;
	g['durationOpening']   = g['duration']*2;
}

function InitializeG() {
	var g = {};
	// ANIMATION
	g['duration'] = 800;
	g['durationlink']      = g['duration']*1;
	g['durationnode']      = g['duration']*1;
	g['durationtranslate'] = g['duration']*2;
	g['durationOpening']   = g['duration']*2;
	g['easedragstage']   = 'cubic-in-out';
	g['easeflipin']      = 'cubic-in-out';
	g['easeflipout']     = 'cubic-in-out';
	g['easeflipinout']   = 'cubic-in-out';
	g['easeplaneadd']    = 'cubic-out';
	g['easeplaneremove'] = 'cubic-in';
	g['easemenuin']      = 'cubic-in-out';
	g['easemenuout']     = 'cubic-in-out';
	g['easelinkin']      = 'cubic-in';
	g['easelinkout']     = 'cubic-out';
	g['easenodein']      = 'exp-in';
	g['easenodeout']     = 'cubic-out';
	g['easeiconin']      = 'cubic-in';
	g['easeiconout']     = 'cubic-out';
	g['easeiconinout']   = 'cubic-in-out';
	g['easeaxesin']      = 'cubic-in';
	g['easeaxesout']     = 'cubic-out';

	// g['easeflipin']      = 'cubic-in-out';
	// g['easeflipout']     = 'cubic-in-out';
	// g['easeflipinout']   = 'cubic-in-out';
	// g['easeplaneadd']    = 'cubic-out';
	// g['easeplaneremove'] = 'cubic-in';
	// g['easeiconin']      = 'sin-in';
	// g['easeiconout']     = 'sin-out';
	// g['easeiconinout']   = 'sin-in-out';
	// g['easemenuin']      = 'cubic-in-out';
	// g['easemenuout']     = 'cubic-in-out';
	// g['easelinkin']      = 'cubic-in';
	// g['easelinkout']     = 'cubic-out';
	
	// g['easeflipin']      = 'cubic-in';
	// g['easeflipout']     = 'cubic-out';
	// g['easeflipinout']   = 'cubic-in-out';
	// g['easeplaneadd']    = 'cubic-out';
	// g['easeplaneremove'] = 'cubic-in';
	// g['easeiconin']      = 'sin-in';
	// g['easeiconout']     = 'sin-out';
	// g['easeiconinout']   = 'sin-in-out';
	// g['easemenuin']      = 'cubic-in-out';
	// g['easemenuout']     = 'cubic-in-out';
	// g['easelinkin']      = 'cubic-in';
	// g['easelinkout']     = 'cubic-out';

	// FORCE
	g['linkDistance'] = 120;
	g['charge'] = -1000;
	g['gravity'] = 0.1;
	g['linkStrength'] = 0.9;
	g['friction'] = 0.8; //0.93;
	g['chargeDistance'] = 500;
	g['theta'] = 0.8;

	g['currentmaxi'] = 300; // 2 levels deep
	g['staggerfactor'] = 2000;
	g['staggermodulo'] = 10;
	// SVG has offsetLeft=8 and offsetTop=8 by default
	g['SVGoffsetLeft'] = 8;
	g['SVGoffsetTop'] = 8;
	// CALCULATED SIZES
	// // iPhone 5s
	// g['svgwidth'] = 1136;
	// g['svgheight'] = 400;
	g['svgheight'] = 675;
	g['hnum'] = 12;
	g['unitsquare'] = g['svgheight']/g['hnum'];
	g['svgwidth'] = 0;
	g['wnum'] = 0;
	// while (g['svgwidth'] < 1260) {
	while (g['svgwidth'] < 1200) {
		g['wnum'] += 1;
		g['svgwidth'] = g['wnum'] * g['unitsquare'];
	}
	g['wnum'] -= 1;
	g['svgwidth'] -= g['unitsquare'];
	g['iconsize'] = (14/16) * g['unitsquare'];
	g['iconpad'] = (1/2) * (g['unitsquare'] - g['iconsize']);
	g['iconedge'] = (1)*g['iconpad'];

	// MARGINS
	g['sidestop']    = 1 + 0.0*(g['unitsquare']);
	g['sidesleft']   = 5*(g['unitsquare']);
	g['sidesbottom'] = 1 + 1.0*(g['unitsquare']);
	g['sidesright']  = 1 + 0.5*(g['unitsquare']);
	g['stagewidth']  = g['svgwidth'] - g['sidesleft'] - g['sidesright'];
	g['stageheight'] = g['svgheight'] - g['sidestop'] - g['sidesbottom'];
	g['axesbarsize'] = (0.5/16)*g['unitsquare'];
	g['axessize']    = (1.0)*g['unitsquare']; //g['iconsize'] + g['iconpad'];
	g['tickheight'] = 2;
	g['tickwidth']  = g['axessize'];
	// ARXIV
	g['arxivwidth']  = (6/8)*g['stagewidth'];
	g['arxivheight'] = (4/8)*g['iconsize'];
	// HELP
	g['helpwidth']  = (6/8)*g['stagewidth'];
	g['helpheight'] = (4/8)*g['iconsize'];

	if (/Chrome/i.test(navigator.userAgent)===true) {
		g['browserisChrome']  = true;
		g['browserisFirefox'] = false;
		g['browserisSafari']  = false;
		console.log('Browser is Chrome');
	}
	else if (/Firefox/i.test(navigator.userAgent)===true) {
		g['browserisChrome']  = false;
		g['browserisFirefox'] = true;
		g['browserisSafari']  = false;
		console.log('Browser is Firefox');
	}
	else if (/Safari/i.test(navigator.userAgent)===true) {
		g['browserisChrome']  = false;
		g['browserisFirefox'] = false;
		g['browserisSafari']  = true;
		console.log('Browser is Safari');
	}
	g['mousedown'] = false;
	g['buttoneventtype'] = 'mousedown';
	g['graphfilldepth'] = 1;
	g['json'] = {};
	g['examiner'] = true;
	g['examinerbgopacity'] = 1;
	g['stagerootx'] = 0;
	g['Yrootx'] = 0;
	g['Xrootx'] = 0;
	g['stagerooty'] = 0;
	g['Yrooty'] = 0;
	g['Xrooty'] = 0;
	g['stagezoom']  = 1;
	g['Yzoom']  = 1;
	g['Xzoom']  = 1;
	g['Yisout'] = false;
	g['Xisout'] = false;
	g['nodediffx'] = 0;
	g['nodediffy'] = 0;

	g['d3event'] = 0;
	g['vamptime'] = 1000000; // The user can't interact until the page loads
	g['vampOverride'] = false;
	g['shiftKey'] = false;

	g['Ysortold'] = 'free';
	g['Xsortold'] = 'free';
	g['Ysortnew'] = 'free';
	g['Xsortnew'] = 'free';

	g['Yviewold'] = 'time';
	g['Xviewold'] = 'time';
	g['Yviewnew'] = 'time';
	g['Xviewnew'] = 'time';

	g['linkcoversblankedstart'] = false;
	g['linkcoversblankedfinal'] = false;
	g['linkcoversexposed'] = false;
	g['linkcoversopacitystart'] = 0;
	g['linkcoversopacityfinal'] = 0;
	g['node_oldname'] = false;
	g['node_this'] = false;
	g['node_d'] = false;

	g['node_r'] = 13;
	g['font-size'] = 18;

	g['planeopacitymax'] = 0.8;
	g['planeopacitynow'] = g['planeopacitymax'];
	g['planeborderopacitynow'] = 1.0;
	g['planepointerevents'] = 'inherit';
	g['planeradius'] = 0.25 * g['svgwidth'];

	// MENUOPTIONS
	g['angleinitial'] = 3/24;
	g['anglewidth'] = 6/24;
	g['angletime'] = -24/24;
	g['anglereferences'] = -18/24;
	g['anglehide'] = -12/24;
	g['angleciting'] = -6/24;
	g['alphabetarray'] = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
	return g;
}

function UnitTestPerspective(XorY, sort, view) {
	g[XorY+'sortnew'] = sort;
	g[XorY+'viewnew'] = view;
	UpdateButton(XorY, sort);
	d3.selectAll('.'+XorY+'dropoption').attr('selected', false);
	d3.select('.'+XorY+'dropoption.'+view).attr('selected', true);
	ApplyViewOption(g[XorY+'viewnew'], XorY);
	TransformView(XorY);
}

function UnitTests(unittest) {
	var testnode, i;
	Vamp(g['duration']);
	switch (unittest) {
		case 'DragStage':
			if (showYAxis === true) {
				DragStage(10, 10);
			}
			if (showXAxis === true) {
				DragStage(10, 10);
			}
			break;
		case 'ExpandYindex':
			g['Ysortnew'] = 'incr';
			g['Yviewnew'] = 'time';
			UpdateButton('Y', 'decr');
			d3.selectAll('.Ydropoption').attr('selected', false);
			d3.select('.Ydropoption.index').attr('selected', true);
			ApplyViewOption(g['Yviewnew'], 'Y');
			TransformView('Y');
			break;
		case 'ExpandXindex':
			g['Xsortnew'] = 'incr';
			g['Xviewnew'] = 'index';
			UpdateButton('X', 'incr');
			d3.selectAll('.Xdropoption').attr('selected', false);
			d3.select('.Xdropoption.index').attr('selected', true);
			ApplyViewOption(g['Xviewnew'], 'X');
			TransformView('X');
			break;
		case 'LoadEntireDataset':
			force.nodes([]);
			force.links([]);
			for (i=0; i<g['json'].nodes.length; i++) {
				force.nodes().push(g['json'].nodes[i]);
			}
			for (i=0; i<g['json'].links.length; i++) {
				force.links().push({
	      			source: g['json'].links[i].source,
	      			target: g['json'].links[i].target
				});
			}
			Refresh();
			break;
		case 'ToggleMenu':
			nodes.each(function() {
				ToggleMenu(this);
			});
			break;
		case 'TogglePlane':
			nodes.each(function() {
				TogglePlane(this);
			});
			break;
		case 'LoadReferences':
			nodes.each(function() {
				LoadReferences(this);
			});
			break;
		case 'LoadCiting':
			nodes.each(function() {
				LoadCiting(this);
			});
			break;
		case 'General':
			testnode = nodes[0][0];
			TogglePlane(testnode);
			SelectNode(testnode);
			ToggleMenu(testnode);
			// UnitTests('LoadReferences');
			UnitTests('LoadCiting');
			UnitTests('ExpandYindex');
			UnitTests('ExpandXindex');
			console.log(g['node_this']);
			break;
		case 'Full':
			testnode = nodes[0][0];
			TogglePlane(testnode);
			SelectNode(testnode);
			ToggleMenu(testnode);
			DebugForce();
			DebugLayout();
			// UnitTests('LoadReferences');
			UnitTests('LoadCiting');
			if (showXAxis === true) {
				UnitTestPerspective('X', 'incr', 'index');
			}
			if (showYAxis === true) {
				UnitTestPerspective('Y', 'decr', 'index');
			}
			UnitTests('ExpandXindex');
			console.log(g['node_this']);
			break;
	}
}