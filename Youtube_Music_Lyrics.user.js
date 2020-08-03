// ==UserScript==
// @name        Youtube Music Lyrics
// @namespace   https://greasyfork.org/users/102866
// @description Adds lyrics to Youtube Music 
// @include     https://music.youtube.com/*
// @require     https://code.jquery.com/jquery-3.5.1.min.js
// @require     https://code.jquery.com/ui/1.12.1/jquery-ui.min.js
// @author      TiLied
// @version     0.2.02
// @grant       GM_listValues
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// @grant       GM_xmlhttpRequest
// @require     https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @grant       GM.listValues
// @grant       GM.getValue
// @grant       GM.setValue
// @grant       GM.deleteValue
// @grant       GM.xmlHttpRequest
// ==/UserScript==

const oneSecond = 1000,
	oneDay = oneSecond * 60 * 60 * 24,
	oneWeek = oneDay * 7,
	oneMonth = oneWeek * 4;

var cache = {},
	tTitle = 0,
	options;

var debug,
	contextmenu,
	ret,
	priority;

//Start
//Function main
void function Main()
{
	console.log("Youtube Music Lyrics v" + GM.info.script.version + " initialization");
	//Place CSS in head
	SetCSS();

	//Url handler for changing
	UrlHandler();

	//Set settings or create
	SetSettings(function ()
	{
		//Disable second mouse click(contextmenu)
		if (contextmenu)
			document.addEventListener("contextmenu", function (e) { e.button === 2 && e.stopPropagation(); }, true);

		//Check music.
		setTimeout(function ()
		{
			//Place UI
			SetUI();

			SetEvents();

			Music();
		}, oneSecond * 7);
	});
	
}();
//Function main
//End

//Start
//Class options
class Options
{
	constructor(debug, contextmenu, priority)
	{
		this.debug = debug;
		this.contextmenu = contextmenu;
		this.priority = priority;
	}

	get values()
	{
		let v = 
		{
			debug: this.debug,
			contextmenu: this.contextmenu,
			priority: this.priority
		};
		return v;
	}

	static string(s)
	{
		switch (s) { 
			case "one":
				return "api - https://github.com/NTag/lyrics.ovh";
			case "two":
				return "api - https://github.com/rhnvrm/lyric-api";
			case "three":
				return "api - http://api.lololyrics.com/";
		}
	}

	set values(obj)
	{
		this.debug = obj["debug"];
		this.contextmenu = obj["contextmenu"];
		this.priority = obj["priority"];
	}

	priorityF(p, id, artist, title)
	{
		let lyrics;

		switch (p)
		{
			case "zero":
				{
					return new Promise(function (resolve)
					{
						if ($.isEmptyObject(cache[id]) || typeof cache[id]["musics"][title] === "undefined")
						{
							resolve(false);
						} else
						{
							AddCache(id, artist, title, lyrics);
							DisplayLyrics(id, title);
							resolve(true);
						}
					});
				}
			case "one":
				{
					return new Promise(function (resolve)
					{
					//api - https://github.com/NTag/lyrics.ovh
					GM.xmlHttpRequest({
							method: "GET",
							url: "https://api.lyrics.ovh/v1/" + artist + "/" + title + "",
							timeout: oneSecond * 5,
							onload: function (response)
							{
								if (debug) console.log(response);
								if (response.status === 200)
								{
									let r = JSON.parse(response.responseText);
									if (Object.keys(r)[0] === "lyrics")
									{
										lyrics = r["lyrics"];
										if (debug) console.log(lyrics);
										AddCache(id, artist, title, lyrics);
										DisplayLyrics(id, title);
										resolve(true);
									} else
									{
										if (debug) console.log(r);
										resolve(false);
									}
								} else
								{
									resolve(false);
								}
							},
							onerror: function (e)
							{
								console.warn(e);
								resolve(false);
							}
							});
					});
				}
			case "two":
				{
					return new Promise(function (resolve)
					{
					//api - https://github.com/rhnvrm/lyric-api

			GM.xmlHttpRequest({
				method: "GET",
				url: "https://lyric-api.herokuapp.com/api/find/" + artist + "/" + title + "",
				timeout: oneSecond * 5,
				onload: function (response)
				{
					if (debug) console.log(response);
					if (response.status === 200)
					{
						let r = JSON.parse(response.responseText);
						if (r["err"] === "none")
						{
							lyrics = r["lyric"];
							if (debug) console.log(lyrics);
							lyrics = HtmlDecode(lyrics);
							AddCache(id, artist, title, lyrics);
							DisplayLyrics(id, title);
							resolve(true);
						} else
						{
							if (debug) console.log(r);
							resolve(false);
						}
					}else
					{
						resolve(false);
					}
				},
				onerror: function (e)
				{
					console.warn(e);
					resolve(false);
				}
			});
					});
				}
			case "three":
				{
					return new Promise(function (resolve)
					{
					//api - http://api.lololyrics.com/

			GM.xmlHttpRequest({
				method: "GET",
				url: "http://api.lololyrics.com/0.5/getLyric?artist=" + artist + "&track=" + title + "",
				timeout: oneSecond * 5,
				onload: function (response)
				{
					if (debug) console.log(response);
					if (response.status === 200)
					{
						let xml = response.responseXML.all;

						if (xml[1].textContent === "OK")
						{
							lyrics = xml[2].innerHTML;
							if (debug) console.log(lyrics);
							AddCache(id, artist, title, lyrics);
							DisplayLyrics(id, title);
							resolve(true);
						} else
						{
							if (debug) console.log(xml);
							resolve(false);
						}
					} else
					{
						resolve(false);
					}
				},
				onerror: function (e)
				{
					console.warn(e);
					resolve(false);
				}
			});
					});
				}
			case "last":
				{
					return new Promise(function (resolve)
					{
						if (debug) console.log("No lyrics found!");
						DisplayLyrics(id, title, "No lyrics found!");
						if (debug) console.log(priority);
						resolve(true);
					});
				}
		}
	}
}
//Class options
//End

//Start
//Functions GM_VALUE
async function SetSettings(callBack)
{
	try
	{
		//DeleteValues("yml_cache");
		//THIS IS ABOUT OPTIONS
		if (await HasValue("yml_options", JSON.stringify(options)))
		{
			let v = JSON.parse(await GM.getValue("yml_options"));
			options = new Options(false, true, ["zero", "one", "two", "three", "last"]);
			options.values = v;
			SetOptionsObj();
		} else
		{
			options = new Options(false, true, ["zero", "one", "two", "three", "last"]);
			SetOptionsObj();
		}

		//THIS IS ABOUT CACHE
		if (await HasValue("yml_cache", JSON.stringify(cache)))
		{
			cache = JSON.parse(await GM.getValue("yml_cache"));
			SetCacheObj();
		}

		//Console log prefs with value
		console.log("*prefs:");
		console.log("*-----*");
		var vals = await GM.listValues();

		//Find out that var in for block is not local... Seriously js?
		for (let i = 0; i < vals.length; i++)
		{
			let str = await GM.getValue(vals[i]);
			console.log("*" + vals[i] + ":" + str);
			const byteSize = str => new Blob([str]).size;
			console.log("Size " + vals[i] + ": " + FormatBytes(byteSize(str)) + "");
		}
		console.log("*-----*");

		if (debug)
		{
			console.log(options);
			console.log(cache);
		}

		callBack();
	} catch (e) { console.log(e); }
}

//Check if value exists or not.  optValue = Optional
async function HasValue(nameVal, optValue)
{
	var vals = await GM.listValues();

	if (vals.length === 0)
	{
		if (optValue !== undefined)
		{
			GM.setValue(nameVal, optValue);
			return true;
		} else
		{
			return false;
		}
	}

	if (typeof nameVal !== "string")
	{
		return alert("name of value: '" + nameVal + "' are not string");
	}

	for (let i = 0; i < vals.length; i++)
	{
		if (vals[i] === nameVal)
		{
			return true;
		}
	}

	if (optValue !== undefined)
	{
		GM.setValue(nameVal, optValue);
		return true;
	} else
	{
		return false;
	}
}

//Delete Values
async function DeleteValues(nameVal)
{
	var vals = await GM.listValues();

	if (vals.length === 0 || typeof nameVal !== "string")
	{
		return;
	}

	switch (nameVal)
	{
		case "all":
			for (let i = 0; i < vals.length; i++)
			{
				if (vals[i] !== "adm")
				{
					GM.deleteValue(vals[i]);
				}
			}
			break;
		case "old":
			for (let i = 0; i < vals.length; i++)
			{
				if (vals[i] === "debug" || vals[i] === "debugA")
				{
					GM.deleteValue(vals[i]);
				}
			}
			break;
		default:
			for (let i = 0; i < vals.length; i++)
			{
				if (vals[i] === nameVal)
				{
					GM.deleteValue(nameVal);
				}
			}
			break;
	}
}

///Update gm value what:"cache","options"
function UpdateGM(what)
{
	var gmVal;

	switch (what)
	{
		case "cache":
			gmVal = JSON.stringify(cache);
			GM.setValue("yml_cache", gmVal);
			break;
		case "options":
			gmVal = JSON.stringify(options.values);
			GM.setValue("yml_options", gmVal);
			break;
		default:
			alert("fun:UpdateGM(" + what + "). default switch");
			break;
	}
}
//Functions GM_VALUE
//End

//Start
//Functions create object option and cache
function SetOptionsObj()
{
	debug = options.debug;
	contextmenu = options.contextmenu;
	UpdateGM("options");
}

function SetCacheObj()
{
	try
	{
		var v = String(GM.info.script.version).split('.');
		v = v.slice(0, 2);
		var ver = v[0] + "." + v[1];

		//Version
		if (typeof cache.versionCache === "undefined")
		{
			cache.versionCache = ver;
			versionCache = cache.versionCache;
		} else
		{
			versionCache = cache.versionCache;
			if (versionCache !== ver)
			{
				cache.versionCache = ver;
				versionCache = cache.versionCache;
				for (var prop in cache)
				{
					if (prop !== "versionCache")
					{
						delete cache[prop];
					}
				}
				//DeleteValues("yml_cache");
			}
		}
	} catch (e) { console.warn(e); }
}
//Functions create object option and cache
//End

//Start
//Functions Get music
function Music()
{
	priority = options.priority;

	var artist = document.querySelector(".subtitle.ytmusic-player-bar").firstElementChild.firstElementChild.innerText;
	var title = document.querySelector(".title.ytmusic-player-bar").innerText;
	var id = document.querySelector(".subtitle.ytmusic-player-bar").firstElementChild.firstElementChild.attributes.href.value;

	if (debug)
	{
		console.log(artist);
		console.log(title);
		console.log(id);
	}

	if (artist === "" || title === "" || typeof id === "undefined" || typeof artist === "undefined" || typeof title === "undefined" )
		return console.warn(artist + "-" + title + "-" + id);

	if (tTitle === 0 || title !== tTitle)
	{
		tTitle = title;
		GetLyrics(priority, id, artist, title);
	} else return;
}

//-------------------------
//CORE STUFF BELOW
//-------------------------

//Start
//Function Add to Cache lyrics
async function AddCache(id, artist, title, lyrics)
{
	if (typeof title === "undefined")
	{
		//TODO DO SOMETHING 
		var a = document.querySelector(".subtitle.ytmusic-player-bar").firstElementChild.firstElementChild.innerText;
		var t = document.querySelector(".title.ytmusic-player-bar").innerText;
		var i = document.querySelector(".subtitle.ytmusic-player-bar").firstElementChild.firstElementChild.attributes.href.value;

		if ($.isEmptyObject(cache[i]))
		{
			cache[i] =
			{
				name: a,
				musics: {},
				//statistics
				gettingLyricsForArtistTimes: 1,
				custom: ""
			};
		}

		if (typeof cache[i]["musics"][t] === "undefined")
		{

			cache[i]["musics"][t] =
			{
				title: t,
				lyrics: lyrics,
				dateId: Date.now(),
				//statistics
				gettingLyricsForMusicTimes: 1,
				custom: ""
			};

		} else
		{
			cache[i]["musics"][t]["lyrics"] = lyrics;
		}
		return;
	}

	if ($.isEmptyObject(cache[id]))
	{
		cache[id] =
		{
			name: artist,
			musics: {},
			//statistics
			gettingLyricsForArtistTimes: 1,
			custom: ""
		};
	} else
	{
		cache[id]["gettingLyricsForArtistTimes"] = cache[id]["gettingLyricsForArtistTimes"] + 1;
	}

	if (typeof cache[id]["musics"][title] === "undefined")
	{

		cache[id]["musics"][title] =
		{
		title:title,
		lyrics:lyrics,
		dateId:Date.now(),
			//statistics
		gettingLyricsForMusicTimes:1,
		custom:""
		};

	} else
	{
		cache[id]["musics"][title]["gettingLyricsForMusicTimes"] = cache[id]["musics"][title]["gettingLyricsForMusicTimes"] + 1;
	}
	if (debug) console.log(cache);
	UpdateGM("cache");
}
//Function Add to Cache lyrics
//End

//-------------------------
//XMLHTTPREQUESTS BELOW
//-------------------------

//Start
//Function xml api
async function GetLyrics(priority, id, artist, title)
{
	for (let i = 0; priority.length; i++)
	{
		let aww = await options.priorityF(priority[i], id, artist, title);
		if(aww === true)
			break;
	}

}
//Function xml api
//End

//-------------------------
//UI AND VISUAL STAFF BELOW
//-------------------------

//Start
//Function set ui 
function SetUI()
{
	var rightC = $(".middle-controls-buttons");
	var mainP = $("#main-panel");
	var divP = $("<div id=yml_lyricsPanel class='style-scope ytmusic-player-page'></div>").html("<pre id=yml_lyricsText class='style-scope ytmusic-player-baryt-formatted-string'>Lyrics:</pre>");
	var divB = $("<div id=yml_lyricsButton class='right-controls-buttons style-scope ytmusic-player-bar'></div>").html("<a class='yml_Button style-scope ytmusic-player-bar yt-formatted-string' style='color:inherit;'>Lyrics</a>");

	var divPB = $("<div id=yml_PanelButtons class='style-scope ytmusic-player-page'></div>").html("<a class='yml_Button' id=yml_addLyricsButton>Add lyrics</a><a class='yml_Button' id=yml_optionButton style='padding-left: 10px;'>Options</a>");
	var divPO = $("<div id=yml_optionsPanel class='style-scope ytmusic-player-page'></div>").html("<a class='style-scope ytmusic-player-baryt-formatted-string' style='color:inherit; font-family:inherit;'>Options:</a><form>\
<br>\
	<input type=checkbox name=debug id=yml_debug >Debug</input><br> \
	<input type=checkbox name=contextmenu id=yml_contextmenu >Context menu</input><br> \
<ul id='image-list1' class='sortable-list'>\
		<br>\
	<li class='ui-state-default ui-state-disabled' id='zero'>Locale cache</li>\
	<li class='ui-state-default' id='one'><span>api-https://github.com/NTag/lyrics.ovh</span></li>\
	<li class='ui-state-default' id='two'><span>api-https://github.com/rhnvrm/lyric-api</span></li>\
	<li class='ui-state-default' id='three'><span>api-http://api.lololyrics.com/</span></li>\
	<li class='ui-state-default ui-state-disabled' id='last' style='display:none;'>Last Not Found!</li>\
</ul >\
</form>");

	if (debug)
	{
		console.log(rightC);
		console.log(mainP);
	}

	$(divP).append(divPB);
	$(divP).prepend(divPO);
	$(mainP).append(divP);
	$(rightC).append(divB);
	$(divP).hide();
	$(divPO).hide();
	UIValues();
}
//Function set ui 
//End


//Start
//Function set UI values of settengs/options
function UIValues()
{
	$("#yml_debug").prop("checked", debug);
	$("#yml_contextmenu").prop("checked", contextmenu);
	let li = $(".sortable-list li");
	for (let i = 1; i < options.priority.length; i++)
	{
		$(li[i]).attr("id", options.priority[i]);
		$(li[i]).find("span").text(Options.string(options.priority[i]));
	}
}
//Function set events
//End

//Start
//Function set css
function SetCSS()
{
	$("head").append($("<!--Start of Youtube Music Lyrics v" + GM.info.script.version + " CSS-->"));

	$("head").append($("<style type=text/css></style>").text("#yml_lyricsPanel { \
	position: absolute;\
	z-index: 100;\
	background-color: #1d1d1d;\
		font-size:16px;\
		overflow-y:scroll;\
		color:#aaaaaa;\
}"));

	$("head").append($("<style type=text/css></style>").text("#yml_lyricsText { \
	color: inherit;\
	font-family: inherit;\
	padding-left: 5%;\
}"));

	$("head").append($("<style type=text/css></style>").text("#yml_PanelButtons { \
	float: right;\
	padding:10px;\
	margin:10px;\
	border: 3px solid;\
}"));

	$("head").append($("<style type=text/css></style>").text("#yml_optionsPanel { \
		position: fixed;\
		z-index: 111;\
		padding-left: 5%;\
		padding-bottom: 5%;\
		border: 3px solid;\
		background-color: #2d2d2d;\
		font-size:16px;\
		overflow-y:scroll;\
		color:#aaaaaa;\
}"));

	$("head").append($("<style type=text/css></style>").text(".yml_Button { \
	cursor: pointer;\
		font-size:16px;\
		color:#aaaaaa;\
}"));

	$("head").append($("<style type=text/css></style>").text(".yml_Button:hover { \
	text-decoration: underline;\
}"));

	$("head").append($("<style type=text/css></style>").text(".ui-state-default { \
	cursor: move;\
}"));

	$("head").append($("<!--End of Youtube Music Lyrics v" + GM.info.script.version + " CSS-->"));
}
//Function set css
//End


//Start
//Function show lyrics
function DisplayLyrics(id, title, lyrics)
{
	if (debug) console.log($("#yml_lyricsPanel pre"));

	if (typeof lyrics === "string")
		return $("#yml_lyricsPanel pre").text(lyrics);

	$("#yml_lyricsPanel pre").text(cache[id]["musics"][title]["lyrics"]);
	if (debug) console.log(cache[id]["musics"][title]["lyrics"]);
}
//Function show lyrics
//End


//Start
//Function set events
function SetEvents()
{
	$("#yml_lyricsButton").click(function ()
	{
		$("#yml_lyricsPanel").toggle(1000);
		let w = $("#main-panel").width();
		let h = $("#main-panel").height();
		$("#yml_lyricsPanel").attr({
			style: "max-height: " + h + "px;max-width:" + (w + 100) + "px;min-width:" + w + "px;"
		});
	});

	$("#yml_optionButton").click(function ()
	{
		$("#yml_optionsPanel").toggle();
		if ($("#yml_optionsPanel").css('display') !== 'none')
		{
			$(this).text("Save Options");
		} else
		{
			UpdateGM("options");
			$(this).text("Options");
		}
	});

	$("#yml_debug").change(function ()
	{
		options.debug = $(this).prop("checked");
		debug = $(this).prop("checked");
	});

	$("#yml_contextmenu").change(function ()
	{
		options.contextmenu = $(this).prop("checked");
		debug = $(this).prop("checked");
	});

	$("#yml_addLyricsButton").click(function ()
	{
		//TODO MAKE BETTER CODE!!!
		if (debug) console.log($("#yml_lyricsText").prop("tagName"));
		if ($("#yml_lyricsText").prop("tagName") === "PRE")
		{
			$(this).text("Save Lyrics");
			let w = $("#yml_lyricsText").width();
			let h = $("#yml_lyricsText").height();
			$("#yml_lyricsText").attr({
				style: "height: " + h + "px;width:" + (w + 100) + "px;"
			});
			$('pre#yml_lyricsText').replaceTag('textarea');
			document.getElementById("yml_lyricsText").value($("#yml_lyricsText").text());
		}
		else
		{
			$(this).text("Add Lyrics");
			$("#yml_lyricsText").text(document.getElementById("yml_lyricsText").value);
			//console.log(document.getElementById("yml_lyricsText").value);
			//cache[id]["musics"][title]["lyrics"] = document.getElementById("yml_lyricsText").value;
			AddCache(undefined, undefined, undefined, document.getElementById("yml_lyricsText").value);
			UpdateGM("cache");
			$("#yml_lyricsText").attr({
				style: "height: inherit;width:inherit;"
			});
			$('textarea#yml_lyricsText').replaceTag('pre');
		}
	});

	$('.sortable-list').sortable({
		connectWith: '.sortable-list',
		items: "li:not(.ui-state-disabled)",
		update: function (event, ui)
		{
			var order = $(this).sortable('toArray');
			order.unshift("zero");
			order.push("last");
			console.log(order);
			options.priority = order;
			priority = order;
		}
	});

}
//Function set events
//End

//-------------------------
//TOOLS BELOW
//-------------------------

//Start
//Handler for url
function UrlHandler()
{
	this.oldHash = window.location.search;
	this.Check;

	var that = this;
	var detect = function ()
	{
		if (that.oldHash !== window.location.search)
		{
			that.oldHash = window.location.search;
			setTimeout(function () { Music(); }, oneSecond + oneSecond);
		}
	};
	this.Check = setInterval(function () { detect(); }, 200);
}
//Handler for url
//End

//Start
//Tool for changing tags https://stackoverflow.com/a/32067355
(function ($)
{
	$.fn.replaceTag = function (newTag)
	{
		var originalElement = this[0]
			, originalTag = originalElement.tagName
			, startRX = new RegExp('^<' + originalTag, 'i')
			, endRX = new RegExp(originalTag + '>$', 'i')
			, startSubst = '<' + newTag
			, endSubst = newTag + '>'
			, newHTML = originalElement.outerHTML
				.replace(startRX, startSubst)
				.replace(endRX, endSubst);
		this.replaceWith(newHTML);
	};
})(jQuery);
//Tool for changing tags https://stackoverflow.com/a/32067355
//End

//Start
//Tool for decoding staff like &#xxxx; https://stackoverflow.com/a/2808386
function HtmlDecode(input)
{
	var e = document.createElement('div');
	e.innerHTML = input;
	return e.childNodes[0].nodeValue;
}
//Tool for decoding staff like &#xxxx; https://stackoverflow.com/a/2808386
//End

//Start
//Format bytes https://stackoverflow.com/a/18650828
function FormatBytes(bytes, decimals = 2)
{
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
//Format bytes https://stackoverflow.com/a/18650828
//End