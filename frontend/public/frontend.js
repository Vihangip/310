function parseFormData(formData) {
	const stringFields = ["uuid", "id", "title", "instructor", "dept"]
	const numberFields = ["year", "avg", "pass", "fail", "audit"];
	const datasetName = "sections";
	let basicQuery =
		{
			"WHERE": {},
			"OPTIONS": {
				"COLUMNS": []
			}
		};
	let conditions = [];
	let columns = [];

	for (let f of stringFields) {
		if (formData.get(f) != "") {
			let basicIS = {"IS": {}};
			basicIS.IS[(datasetName + "_" + f)] = formData.get(f);
			conditions.push(basicIS);
		}
		columns.push(datasetName + "_" + f);
	}
	for (let f of numberFields) {
		if (formData.get(f) != "") {
			let basicMComp = {};
			let thing = {[(datasetName + "_" + f)]: parseInt(formData.get(f))};
			console.log(thing);
			basicMComp[formData.get(f + "-comparison")] = thing;
			conditions.push(basicMComp);
		}
		columns.push(datasetName + "_" + f);
	}
	if (conditions.length > 1) {
		basicQuery.WHERE = {
			"AND": conditions
		};
	} else if (conditions.length === 1) {
		basicQuery.WHERE = conditions[0];
	}
	basicQuery.OPTIONS.COLUMNS = columns; // todo actually be able to select
	return basicQuery;
}

function handleHttpRequest() {
	// this is where you deal with the response from the server, e.g. displaying results
	// todo: display results

	if (httpRequest.readyState === XMLHttpRequest.DONE) {
		if (httpRequest.status === 200) {
			// No problem with request, display here
			console.log(httpRequest.responseText);
		} else {
			// There was a problem with the request.
			// For example, the response may have a 404 (Not Found)
			// or 500 (Internal Server Error) response code.
		}
	} else {
		// Not ready yet.
	}
}

function handleQuerySubmit(event) {
	event.preventDefault();
	const formData = new FormData(event.target);
	const query = parseFormData(formData);
	console.log(query);

	// much of the AJAX code is based heavily on the provided AJAX documentation:
	// https://developer.mozilla.org/en-US/docs/Web/Guide/AJAX/Getting_Started
	httpRequest.open("POST", "http://localhost:4321/query", true);
	httpRequest.setRequestHeader("Content-Type","application/json");
	httpRequest.send(JSON.stringify(query));
}

let httpRequest = new XMLHttpRequest();
httpRequest.onreadystatechange = handleHttpRequest;
document.getElementById("query-form").addEventListener('submit', handleQuerySubmit);
