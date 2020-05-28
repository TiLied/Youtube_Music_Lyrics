// ==UserScript==
// @name        Youtube Music Lyrics
// @namespace   https://greasyfork.org/users/102866
// @description Adds lyrics to Youtube Music 
// @include     https://music.youtube.com/*
// @require     https://code.jquery.com/jquery-3.5.1.min.js
// @author      TiLied
// @version     0.1.00
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
	tTitle = 0;

var debug = false;

//Start
//Function main
void function Main()
{
	console.log("Youtube Music Lyrics v" + GM.info.script.version + " initialization");
	//Place CSS in head
	SetCSS();

	//Disable secodn mouse click(contextmenu)
	//TODO make option
	document.addEventListener("contextmenu", function (e) { e.button === 2 && e.stopPropagation(); }, true);

	//Url handler for changing
	UrlHandler();

	//Set settings or create
	SetSettings(function ()
	{
		//Check music.
		setTimeout(function ()
		{
			//Place UI
			SetUI();

			SetEvents();

			Music();
		}, oneSecond * 10);
	});
	
}();
//Function main
//End

//Start
//Functions GM_VALUE
async function SetSettings(callBack)
{
	try
	{
		//DeleteValues("all");
		//if (debug && await GM.getValue("adm"))
		//	DeleteValues("imdbe_cache");
		//THIS IS ABOUT OPTIONS
		//if (await HasValue("yml_options", JSON.stringify(options)))
		//{
		//	options = JSON.parse(await GM.getValue("imdbe_options"));
		//	SetOptionsObj();
		//}

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
			console.log("*" + vals[i] + ":" + await GM.getValue(vals[i]));
		}
		console.log("*-----*");
		if (debug)
		{
			//console.log(options);
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
			gmVal = JSON.stringify(options);
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
				DeleteValues("yml_cache");
			}
		}
	} catch (e) { console.error(e); }
}
//Functions create object option and cache
//End

//Start
//Functions Get music
function Music()
{
	var priority = 0;

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
		return console.error(artist + "-" + title + "-" + id);

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
function GetLyrics(priority, id, artist, title)
{
	var lyrics;

	switch (priority)
	{
		case 0:
			if ($.isEmptyObject(cache[id]) || typeof cache[id]["musics"][title] === "undefined")
			{
				priority++;
				return GetLyrics(priority, id, artist, title);
			} else
			{
				AddCache(id, artist, title, lyrics);
				DisplayLyrics(id, title);
			}
			break;
		case 1:
			//api - https://github.com/NTag/lyrics.ovh
			if (debug) console.log(priority);

			GM.xmlHttpRequest({
				method: "GET",
				url: "https://api.lyrics.ovh/v1/" + artist + "/" + title + "",
				timeout: oneSecond * 5,
				onload: function (response)
				{
					if (debug) console.log(response);
					let r = JSON.parse(response.responseText);
					if (Object.keys(r)[0] === "lyrics")
					{
						lyrics = r["lyrics"];
						if (debug) console.log(lyrics);
						AddCache(id, artist, title, lyrics);
						DisplayLyrics(id, title);
					} else
					{
						if (debug) console.log(r);
						priority++;
						return GetLyrics(priority, id, artist, title);
					}
				},
				onerror: function (e)
				{
					console.error(e);
					priority++;
					return GetLyrics(priority, id, artist, title);
				}
			});
			break;
		case 2:
			//api - https://github.com/rhnvrm/lyric-api
			if (debug) console.log(priority);

			GM.xmlHttpRequest({
				method: "GET",
				url: "https://lyric-api.herokuapp.com/api/find/" + artist + "/" + title + "",
				timeout: oneSecond * 5,
				onload: function (response)
				{
					if (debug) console.log(response);
					let r = JSON.parse(response.responseText);
					if (Object.keys(r)[0] === "lyric" && r[1] === "none")
					{
						lyrics = r["lyric"];
						if (debug) console.log(lyrics);
						AddCache(id, artist, title, lyrics);
						DisplayLyrics(id, title);
					} else
					{
						if (debug) console.log(r);
						priority++;
						return GetLyrics(priority, id, artist, title);
					}
				},
				onerror: function (e)
				{
					console.error(e);
					priority++;
					return GetLyrics(priority, id, artist, title);
				}
			});
			break;
		default:
			if (debug) console.log("No lyrics found!");
			DisplayLyrics(id, title, "No lyrics found!");
			if (debug) console.log(priority);
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
	var divP = $("<div id=yml_lyricsPanel class='style-scope ytmusic-player-page'></div>").html("<pre class='style-scope ytmusic-player-baryt-formatted-string' style='color:inherit;'>Lyrics:</pre>");
	var divB = $("<div id=yml_lyricsButton class='right-controls-buttons style-scope ytmusic-player-bar'></div>").html("<a class='yt-simple-endpoint style-scope ytmusic-player-bar yt-formatted-string' style='color:inherit;'>Lyrics</a>");

	if (debug)
	{
		console.log(rightC);
		console.log(mainP);
	}

	$(mainP).append(divP);
	$(rightC).append(divB);
	$(divP).hide();
}
//Function set ui 
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
	max-width: inherit;\
		font-size:16px;\
		overflow-y:scroll;\
		color:#aaaaaa;\
}"));

	$("head").append($("<style type=text/css></style>").text("#yml_lyricsButton { \
	cursor: pointer;\
		font-size:16px;\
		color:#aaaaaa;\
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
			style: "max-width:" + w + "px; max-height: " + h + "px;"
		});
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