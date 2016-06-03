var Response = $.import('sap.odata.util.lib.response', 'response').Response;
var MultiMap = $.import('sap.odata.util.lib', 'multiMap').MultiMap;

/**
 * 
 * 
 * <code>
 * 
 * GET https://example.hana.ondemand.com/path/to/service.xsodata HTTP/1.1
 * Content-Type: multipart/mixed;boundary=batch_7317-c239-9c8d
 * 
 * </code>
 * 
 * 
 */
function WebResponse(webRequest, webResponse) {
	if(!webRequest) throw 'Missing required attribute webRequest\nat: ' + new Error().stack;
	if(!webResponse) throw 'Missing required attribute webResponse for request ' + webRequest.id + '\nat: ' + new Error().stack;
	
	Response.call(this, webRequest, webResponse);
	
	var headers = this.copyHeaders(),
		json = webResponse.status < 300 &&
			headers.get('content-type') === 'application/json',
		data = this.webResponse.body ? json ? JSON.parse(this.webResponse.body.asString()) :
			this.webResponse.body.asString() : null;
			
	Object.defineProperties(this, {
		'data': {
			value: data
		},
		'json': {
			value: json
		},
		'headers': {
			value: headers
		}
	});
	
	Object.defineProperties(this, {
		'boundary': {
			value: this.isMultipartResponse()
					? this.headers.get('content-type').match(/boundary=(.*)$/)[1]
					: null
		}
	});
}

WebResponse.prototype = new Response();
WebResponse.prototype.constructor = WebResponse;

/*
 * See sap.odata.util.lib.request.Request#copyRequestHeadersTo
 */
WebResponse.prototype.copy = function(propertyName) {
	return MultiMap.from(this.webResponse[propertyName]);
};

WebResponse.prototype.copyHeaders = function() {
	return this.copy('headers');
};

WebResponse.prototype.copyResponseHeadersTo = function(upstreamResponse) {
	this.headers.filter(function(entry) {
		// HANA will take care of this
		return ['content-length', 'content-encoding'].indexOf(entry.key) !== -1;
	}).copyToTupleList(upstreamResponse.headers);
};

WebResponse.prototype.applyToOutboundResponse = function() {
	this.copyResponseHeadersTo($.response);
	$.response.status = this.webResponse.status;
	
	$.response.setBody(this.getOutboundBody());
};

WebResponse.prototype.getOutboundBody = function() {
	if(!this.isMultipartResponse()) {
		return this.json ? JSON.stringify(this.data) : this.data || '';
	}
	
	return this.getOutboundChildEntityBody();
};

WebResponse.prototype.getOutboundChildEntityBody = function() {
	var bodyParts = [];
	
	this.children.forEach(function(child) {
		bodyParts.push('--' + this.boundary);
		bodyParts.push(child.getOutboundBody());
	}.bind(this));
	
	bodyParts.push('--' + this.boundary + '--');
	
	return bodyParts.join('\n');
};


