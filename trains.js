/*global gapi,XDomainRequest */
var URL = "https://product-details.mozilla.org/1.0/firefox_versions.json";
// To store the JSON content
var jsonContent = {};
var BRANCHES = [
  ["release", "LATEST_FIREFOX_VERSION"],
  ["beta", "LATEST_FIREFOX_DEVEL_VERSION"],
  ["nightly", "FIREFOX_NIGHTLY"],
  ["esr", "FIREFOX_ESR", "ESR"],
  ["esr_next", "FIREFOX_ESR_NEXT", "Next ESR"],
];
var RELEASE_CALENDAR = "mozilla.com_2d37383433353432352d3939@resource.calendar.google.com";

var versions = {};

function getVersion(jsonContent, keyJSON) {
  return jsonContent[keyJSON].replace(/[ab]\d+$/, '').replace(/esr$/, '');
}

function populateVersionInfo(jsonContent) {
  for (var i = 0; i < BRANCHES.length; i++) {
    var branch = BRANCHES[i][0];
    var key = BRANCHES[i][1];
    var description = BRANCHES[i][2];
    appendVersionInfo(branch, getVersion(jsonContent, key), description);
  }
}

function fetchData() {
  if (window.XDomainRequest) {
    var xdr = new XDomainRequest();
    xdr.open("GET", URL);
    xdr.onload = function() {
      jsonContent = JSON.parse(xdr.responseText);
      populateVersionInfo(jsonContent);
    };
    xdr.send();
  }
  else {
    var req = new XMLHttpRequest();
    req.onreadystatechange = function(ev) {
      if (req.readyState == 4 && req.status == 200) {
        jsonContent = JSON.parse(req.responseText);
        populateVersionInfo(jsonContent);
      }
    };
    req.open("GET", URL, true);
    req.send(null);
  }
}

function fixupReleaseVersion(release_version, beta_version) {
  if (release_version != beta_version) {
    return release_version;
  }
  // They shouldn't be the same, this must be uplift week.
  return (parseInt(release_version) - 1) + ".0";
}

function appendVersionInfo(branch, version, description, h2) {
  console.log("appendVersionInfo(%s, %s, %s)", branch, version, description);
  if (branch == "esr_next") {
    if (version == "") {
      // In the context of ESR_NEXT, version can be empty
      // In this case, don't do anything
      return;
    } else {
      // Special case for ESR, add it to the header
      makeHeader(branch, description);
    }
  }
  versions[branch] = version;
  h2 = h2 || document.getElementById(branch);
  if (!h2)
    return;
  branch = description || branch[0].toUpperCase() + branch.slice(1);
  var div_branch = document.createElement("div");
  var div_version = document.createElement("div");
  div_branch.textContent = branch;
  div_version.textContent = version;
  h2.appendChild(div_version);
  h2.appendChild(div_branch);
}

function makeHeader(branch, description) {
  var h2 = document.createElement("h2");
  h2.id = branch;
  h2.className = "version";
  if (branch in versions) {
    appendVersionInfo(branch, versions[branch], description, h2);
  }
  document.getElementById("flex-container").appendChild(h2);
}

function init() {
  // the - 1 in the loop declaration is a workaround for esr_next
  // because sometime, this variable is empty (when we manage only one ESR)
  for (var i = 0; i < BRANCHES.length - 1; i++) {
    var branch = BRANCHES[i];
    makeHeader(branch[0], branch[2]);
  }
}

function setNextUplift(date, link) {
  var h2 = document.createElement("h2");
  h2.id = "uplift";
  var span = document.createElement("span");
  span.textContent = "Next merge day: ";
  var a = document.createElement("a");
  a.textContent = date;
  a.href = link;
  a.title = "Google calendar event";
  span.appendChild(a);
  h2.appendChild(span);
  document.body.appendChild(h2);
}

function loadCalendar() {
  var request = gapi.client.calendar.events.list({
    calendarId: RELEASE_CALENDAR,
    singleEvents: true,
    orderBy: "startTime",
    q: "MERGE"
    //"timeMin": "xxx"
  });
  request.execute(function (r) {
    var now = new Date();
    if (!r.items) {
      console.warn('Got no Google calendar data!');
      return;
    }
    for (var i=0; i < r.items.length; i++) {
      var item = r.items[i];
      if (item.summary.substr(0, 6) == "MERGE:") {
        // This doesn't handle dateTime or timeZone, but these calendar
        // events are all just dates currently.
        // This is terrible, but hey, datetime math.
        var then = new Date(r.items[i].start.date + "T09:00:00.000");
        console.log(r.items[i].start.date);
        if (now.getTime() < then.getTime()) {
          // TODO: could format the date better, also
          // would be nice to do relative dates like "today" or "tomorrow".
          setNextUplift(r.items[i].start.date, r.items[i].htmlLink);
          break;
        } else if (now.getFullYear() == then.getFullYear() &&
                   now.getMonth() == then.getMonth() &&
                   now.getDate() == then.getDate()) {
          setNextUplift("TODAY!", r.items[i].htmlLink);
          break;
        }
      }
    }
  });
}

function gapi_init() {
   gapi.client.setApiKey("AIzaSyCfLN9nQUWw4_GM1BHAx2S-laAOvDwvMg4");
   gapi.client.load("calendar", "v3").then(loadCalendar);
}
document.addEventListener("DOMContentLoaded", init, false);
// Start fetching data before the page finishes loading.
fetchData();
