/*
 * Stores the app's base URL.
 * @var string
 */
var _base = "http://www.schwingenonline.ch";

/*
 * Stores the app's API path.
 * @var string
 */
var _api = "/api/json/";

/*
 * Stores the initial landing page.
 * @var string
 */
var _home = 'news.recent';

/******************************************************************************
* CONFIGURATION END - DO NOT EDIT LINES BELOW
******************************************************************************/

/*
 * Stores the routing table.
 * @var json
 */
var _routing = null;

/*
 * Stores the loaded templates.
 * @var array
 */
var _tpl = {};

/*
 * Stores the localStorage object.
 * @var object
 */
var _storage = window.localStorage;

/*
 * Stores various application data.
 * @var array
 */
var _data = {};

/******************************************************************************
* VARIABLE DECLARATIONS END
******************************************************************************/

/**
 * Loads the routing table.
 * Loads routing table from file 'routing.json' and stores in _routing for direct access.
 */
function load_routing(callback) {
    $.ajax({
	    url: 'routing.json',
	    dataType: 'json',
	    cache: true
	})
	.done(function(data, status, xhr) {
		_routing = data;
		return callback(null);
    })
    .fail(function(xhr, status, error) {
    	return callback(true);
    });
}

/**
 * Loads the templates.
 * Loads every template file defined in templates into _tpl array for direct access.
 */
function load_templates(callback) {
    var templates = [
    	'athlets',
    	'categories',
    	'error',
    	'news',
    	'post',
    	'search',
    	'search_results'
    ];

    $.each(templates, function(i, e) {
    	$.ajax({
	    	url: 'tpl/' + e + '.mustache',
	    	dataType: 'html',
	    	cache: true
	    })
	    .done(function(data, status, xhr) {
	    	_tpl[e] = data;

	    	if (i == templates.length - 1) {
	    		return callback(null);
	    	}
    	})
    	.fail(function(xhr, status, error) {
    		return callback(true);
    	});
    });
}

/******************************************************************************
* STATIC FILE LOADERS END
******************************************************************************/

/**
 * onGoing click event listener for internal links
 */
$(document).on('click', 'a[data-routing]', function(e) {
    e.preventDefault();
    navigator.notification.activityStart("Laden", "Inhalt wird geladen...");

    var routing = $(this).data('routing');
    var identifier = $(this).data('identifier');
    var tab = $(this).data('tab');
    var tpl = $(this).data('tpl');

    process_click(routing, identifier, tab, tpl, hide_loader);
});

/**
 * Initializes the application.
 */
function init_app() {
	setTimeout(function() {
		_storage.clear();

		$('#news').find('.tab').click();

		iscroll = new iScroll('scroller', {
			hScroll: false,
			hScrollbar: false
		});
	}, 750);
}

/**
 * Processes click events.
 * Every time a link gets clicked a 'click' event is raised.
 *
 * @param routing - routing information
 * @param identifier - unique identifier
 * @param tab - tab to activate/show content in
 * @param tpl - template to render
 * @param callback - callback function
 *	-> called after successful processing the click
 */
function process_click(routing, identifier, tab, tpl, callback) {
	update_ui(routing, tab);

	var tpl = tpl;

	if (routing.substring(0, 8) == "internal") {
		async.waterfall([
		    function(callback) {
		        render_tpl(tpl, '', callback);
		    }
		], function (err, result) {
			return callback();
		});
	} else {
		async.waterfall([
		    function(callback) {
		        get_data(routing, identifier, callback);
		    },
		    function(arg1, callback) {
		        render_tpl(tpl, arg1, callback);
		    }
		], function (err, result) {
			return callback();
		});
	}
}

/**
 * Updates the UI components.
 * Adds and removes classes and states of UI elements.
 *
 * @param routing - current routing state
 * @param tab - tab to activate
 */
function update_ui(routing, tab) {
	setTimeout(function() {
		if (routing == _home) {
			$('.app-icon').removeClass('up').attr('disabled', 'disabled');
			$('.chevron').hide();
		} else {
			$('.app-icon').addClass('up').removeAttr('disabled');
			$('.chevron').show();
		}

		$('.tab').parent().removeClass('active');
		$('#' + tab).addClass('active');
	}, 0);
}

/**
 * Returns the data for given URI.
 * Fetchs and returns the data for the given URI and proceeds with callback.
 *
 * @param routing - routing information
 * @param identifier - unique identifier
 * @param callback - callback function
 *	-> called after data have been fetched
 */
function get_data(routing, identifier, callback) {
	var uri = routing + "__" + identifier;
	var storage = _storage.getItem(uri);

	if (storage !== null) {
		var json = $.parseJSON(storage);
		return callback(false, json);
	} else {
		var api = _base + _api;

		var route = routing.split('.');
		var base = route[0];
		var child = route[1];

		var source = api + _routing[base][child];

		if (identifier !== null) {
			source += identifier;
		}

		source += "&callback=?";

		async.waterfall([
		    function(callback) {
		        fetch_json(source, callback);
		    }
		], function (err, result) {
			var string = JSON.stringify(result);
			_storage.setItem(uri, string);

			return callback(null, result);
		});
	}

	return false;
}

/**
 * Renders the template.
 * Renders the data with given mustache template.
 *
 * @param tpl - template to render
 * @param data - data to render
 * @param callback - callback function
 *	-> called after templates has been rendered
 */
function render_tpl(tpl, data, callback) {
	setTimeout(function () {
		var output = Mustache.to_html(_tpl[tpl], data, {
			'error': _tpl['error']
		});

		$('#scroller').html(output);

		return callback(null);
	}, 0);
}

/**
 * Fetchs a JSON from given remove URL.
 * Receivces and fetchs JSON from remote URL and proceeds with callback.
 *
 * @param url - remote origin URL
 * @param callback - callback function
 *	-> called after JSON was fetched
 */
function fetch_json(url, callback) {
	var api = url;

	$.ajax({
		url: api,
		type: 'GET',
		dataType: 'json',
		timeout: 5000,
		cache: true
	})
	.done(function(data, status, xhr) {
		return callback(null, data);
	})
	.fail(function(xhr, status, error) {
		return callback(true);
	});
}

/**
 * Hides the loading animation.
 * Hides the loader and scrolls back to top to reset previous scolling position.
 */
function hide_loader() {
	setTimeout(function() {
		navigator.notification.activityStop();
	}, 500);
}