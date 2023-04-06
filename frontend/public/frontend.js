function parseColumns(formData) {
	let columns = [];
	for (let f of stringFields) {
		if (formData.get(f + "-column") === "on") {
			columns.push(datasetName + "_" + f);
		}
	}
	for (let f of numberFields) {
		if (formData.get(f + "-column") === "on") {
			columns.push(datasetName + "_" + f);
		}
	}
	return columns;
}

function parseFormData(formData) {
	let basicQuery =
		{
			"WHERE": {},
			"OPTIONS": {
				"COLUMNS": []
			}
		};
	let conditions = [];

	for (let f of stringFields) {
		if (formData.get(f) != "") {
			let basicIS = {"IS": {}};
			basicIS.IS[(datasetName + "_" + f)] = formData.get(f);
			conditions.push(basicIS);
		}
	}
	for (let f of numberFields) {
		if (formData.get(f) != "") {
			let basicMComp = {};
			let thing = {[(datasetName + "_" + f)]: parseFloat(formData.get(f))};
			console.log(thing);
			basicMComp[formData.get(f + "-comparison")] = thing;
			conditions.push(basicMComp);
		}
	}
	if (conditions.length > 1) {
		basicQuery.WHERE = {
			"AND": conditions
		};
	} else if (conditions.length === 1) {
		basicQuery.WHERE = conditions[0];
	}
	basicQuery.OPTIONS.COLUMNS = parseColumns(formData);
	return basicQuery;
}

function getCourseInfo(course) {
	let info = [];
	for (let f of stringFields) {
		info.push(course[datasetName + "_" + f]);
	}
	for (let f of numberFields) {
		info.push(course[datasetName + "_" + f]);
	}
	return info;
}

function makeTable(result) {
	let table = "<table><tr>";
	let firstCourse = result[0];
	let firstCourseInfo = getCourseInfo(firstCourse);
	for (let i = 0; i < headers.length; i++) {
		if (firstCourseInfo[i] != undefined) {
			table += "<th>" + headers[i] + "</th>";
		}
	}
	table += "</tr>";
	for (let i = 0; i < result.length; i++) {
		let course = result[i];
		let courseInfo = getCourseInfo(course);
		table += '<tr>';
		for (let info of courseInfo) {
			if (info != undefined) {
				table += '<td>' + info + '</td>';
			}
		}
		table += '</tr>';
	}
	table += '</table>';
	return table;
}


function handleHttpRequest() {
	// this is where you deal with the response from the server, e.g. displaying results
	// todo: display results
	console.log("handleHttpRequest called");
	if (httpRequest.readyState === XMLHttpRequest.DONE) {
		if (httpRequest.status === 200) {
			// No problem with request, display here
			const response = JSON.parse(httpRequest.responseText);
			let result = response.result;
			if (result.length === 0) {
				let error = "No such values exist. Please double check your input and try again. ";
				document.getElementById('results').innerHTML = error;
			} else {
				document.getElementById('results').innerHTML = makeTable(result);
			}
		} else {
			let error = "Error in obtaining query results";
			document.getElementById('results').innerHTML = error;
		}
	} else {
		// Not ready yet.
	}
}


function handleQuerySubmit(event) {
	console.log("handleQuerySubmit called");
	event.preventDefault();
	const formData = new FormData(event.target);
	const query = parseFormData(formData);
	console.log(query);

	// much of the AJAX code is based heavily on the provided AJAX documentation:
	// https://developer.mozilla.org/en-US/docs/Web/Guide/AJAX/Getting_Started
	httpRequest.open("POST", "http://localhost:4321/query", true);
	httpRequest.setRequestHeader("Content-Type","application/json");
	httpRequest.send(JSON.stringify(query));
	httpRequest.onreadystatechange = handleHttpRequest;
}

const stringFields = ["uuid", "id", "title", "instructor", "dept"]
const numberFields = ["year", "avg", "pass", "fail", "audit"];
let headers = ["Section ID", "Course ID", "Course Name", "Instructor", "Department",
	"Year", "Average", "Pass", "Fail", "Audit"];
const datasetName = "sections";
let httpRequest = new XMLHttpRequest();
console.log("here");
document.getElementById("query-form").addEventListener('submit', handleQuerySubmit);
