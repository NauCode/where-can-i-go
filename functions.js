var map;
var container;
var zoom = 10;
var centerPoint = new google.maps.LatLng(40.416775, -3.703790);
var dirService = new google.maps.DirectionsService();
var centerMarker;
var circleMarkers = Array();
var circlePoints = Array();
var drivePolyPoints = Array();
var searchPolygon, drivePolygon;
var distToDrive = 5000*0.000621371192; // miles
var pointInterval = 30;
var searchPoints = [];
var polyline;
var polylines = [];
var redIcon8 = "https://maps.gstatic.com/intl/en_us/mapfiles/markers2/measle.png";

function initialize() {
    map = new google.maps.Map(
        document.getElementById("map_canvas"), {
        center: centerPoint,
        zoom: 9,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });
    google.maps.event.addListener(map, "click", mapClick);
}
google.maps.event.addDomListener(window, "load", initialize);

function mapClick(evt) {
    // map.clearOverlays();
    circleMarkers = Array();
    if (!centerMarker) {
        centerMarker = new google.maps.Marker({
            position: evt.latLng,
            map: map
        });
        centerMarker.setMap(map);
        searchPoints = getCirclePoints(evt.latLng, distToDrive);
        drivePolyPoints = Array();
        getDirections();
    }

}

function getCirclePoints(center, radius) {
    var bounds = new google.maps.LatLngBounds();
    var circlePoints = Array();
    var searchPoints = Array();
    with (Math) {
        var rLat = (radius / 3963.189) * (180 / PI); // miles
        var rLng = rLat / cos(center.lat() * (PI / 180));
        for (var a = 0; a < 361; a++) {
            var aRad = a * (PI / 180);
            var x = center.lng() + (rLng * cos(aRad));
            var y = center.lat() + (rLat * sin(aRad));
            var point = new google.maps.LatLng(parseFloat(y), parseFloat(x), true);
            bounds.extend(point);
            circlePoints.push(point);
            if (a % 9 == 0) {
                searchPoints.push(point);
            }
        }
    }
    searchPolygon = new google.maps.Polygon({
        paths: circlePoints,
        strokeColor: '#0000ff',
        strokeWeight: 1,
        strokeOpacity: 1,
        fillColor: '#0000ff',
        fillOpacity: 0.2
    });
    searchPolygon.setMap(map);
    map.fitBounds(bounds);
    return searchPoints;
}

function getDirections() {
    if (!searchPoints.length) {
        return;
    }
    var to = searchPoints.shift();
    var request = {
        origin: centerMarker.getPosition(),
        destination: to,
        travelMode: google.maps.TravelMode.DRIVING
    };
    setTimeout(() => dirService.route(request, function (result, status) {
        if (status == google.maps.DirectionsStatus.OK) {
            var distance = parseInt(result.routes[0].legs[0].distance.value / 1609);
            var duration = parseFloat(result.routes[0].legs[0].duration.value / 3600).toFixed(2);
            var path = result.routes[0].overview_path;
            var legs = result.routes[0].legs;
            if (polyline && polyline.setPath) {
                polyline.setPath([]);
            } else {
                polyline = new google.maps.Polyline({
                    path: [],
                    // map: map,
                    strokeColor: "#FF0000",
                    strokeOpacity: 1
                });
            }
            for (i = 0; i < legs.length; i++) {
                var steps = legs[i].steps;
                for (j = 0; j < steps.length; j++) {
                    var nextSegment = steps[j].path;
                    for (k = 0; k < nextSegment.length; k++) {
                        polyline.getPath().push(nextSegment[k]);
                        // bounds.extend(nextSegment[k]);
                    }
                }
            }
            // polyline.setMap(map);
            shortenAndShow(polyline);
            getDirections();
        } else {
            console.log("Directions request failed, status=" + status + " [from:" + request.origin + " to:" + request.destination + "]");
            getDirections();
        }
    }), 1100);
}

function shortenAndShow(polyline) {
    var distToDriveM = distToDrive * 1609;
    var dist = 0;
    var cutoffIndex = 0;
    var copyPoints = Array();
    for (var n = 0; n < polyline.getPath().getLength() - 1; n++) {
        dist += google.maps.geometry.spherical.computeDistanceBetween(polyline.getPath().getAt(n), polyline.getPath().getAt(n + 1));
        //GLog.write(dist + ' - ' + distToDriveM);
        if (dist < distToDriveM) {
            copyPoints.push(polyline.getPath().getAt(n));
        } else {
            break;
        }
    }
    var lastPoint = copyPoints[copyPoints.length - 1];
    var newLine = new google.maps.Polyline({
        path: copyPoints,
        strokeColor: '#ff0000',
        strokeWeight: 2,
        strokeOpacity: 1
    });
    newLine.setMap(map);
    polylines.push(newLine);
    drivePolyPoints.push(lastPoint);
    addBorderMarker(lastPoint, dist)
    if (drivePolyPoints.length > 3) {
        if (drivePolygon) {
            drivePolygon.setMap(null);
        }
        drivePolygon = new google.maps.Polygon({
            paths: drivePolyPoints,
            strokeColor: '#00ff00',
            strokeWeight: 1,
            strokeOpacity: 1,
            fillColor: '#00ff00',
            fillOpacity: 0.4
        });
        drivePolygon.setMap(map);
    }
}

function addBorderMarker(pt, d) {
    var str = pt.lat().toFixed(6) + ',' + pt.lng().toFixed(6) + ' - Driving Distance: ' + (d / 1609).toFixed(2) + ' miles';
    var marker = new google.maps.Marker({
        position: pt,
        icon: redIcon8,
        title: str
    });
    circleMarkers.push(marker);
    marker.setMap(map);
}

function clearOverlays() {
    for (var i = 0; i < circleMarkers.length; i++) {
        circleMarkers[i].setMap(null);
    }
    circleMarkers = [];
    for (var i = 0; i < circlePoints.length; i++) {
        circlePoints[i].setMap(null);
    }
    circlePoints = [];
    for (var i = 0; i < polylines.length; i++) {
        polylines[i].setMap(null);
    }
    polylines = [];
    if (searchPolygon && searchPolygon.setMap) searchPolygon.setMap(null);
    if (drivePolygon && drivePolygon.setMap) drivePolygon.setMap(null);
    if (centerMarker && centerMarker.setMap) centerMarker.setMap(null);
}