const BASE_URL = "https://api.harvardartmuseums.org";
const KEY = ";)";

async function fetchAllCenturies() {
  const url = `${BASE_URL}/century?${KEY}&size=100&sort=temporalorder`;

  if (localStorage.getItem("centuries")) {
    return JSON.parse(localStorage.getItem("centuries"));
  }

  onFetchStart();

  try {
    const response = await fetch(url);
    const data = await response.json();
    const records = data.records;

    localStorage.setItem("centuries", JSON.stringify(records));
    return records;
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
}

async function fetchAllClassifications() {
  const url = `${BASE_URL}/classification?${KEY}&size=100&sort=name`;
  onFetchStart();

  if (localStorage.getItem("classifications")) {
    return JSON.parse(localStorage.getItem("classifications"));
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    const records = data.records;

    localStorage.setItem("classifications", JSON.stringify(records));
    return records;
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
}

async function prefetchCategoryLists() {
  onFetchStart();
  try {
    const [classifications, centuries] = await Promise.all([
      fetchAllClassifications(),
      fetchAllCenturies(),
    ]);

    // This provides a clue to the user, that there are items in the dropdown
    $(".classification-count").text(`(${classifications.length})`);

    classifications.forEach((classification) => {
      // append a correctly formatted option tag into
      // the element with id select-classification

      const element = `<option value="${classification.name}">${classification.name}</option>`;
      $("#select-classification").append(element);
    });

    // This provides a clue to the user, that there are items in the dropdown
    $(".century-count").text(`(${centuries.length})`);

    centuries.forEach((century) => {
      // append a correctly formatted option tag into
      // the element with id select-century

      const element = `<option value="${century.name}">${century.name}</option>`;
      $("#select-century").append(element);
    });
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
}

function buildSearchString() {
  const selectedClassification = $("#select-classification").val();
  const selectedCentury = $("#select-century").val();
  const keywords = $("#keywords").val();

  return encodeURI(
    `${BASE_URL}/object?${KEY}&classification=${selectedClassification}&century=${selectedCentury}&keyword=${keywords}`
  );
}

async function fetchObjects() {
  const url = `${BASE_URL}/object?${KEY}`;
  onFetchStart();

  try {
    const response = await fetch(url);
    const data = await response.json();

    return data;
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
}

function renderPreview(record) {
  const { primaryimageurl, title, description } = record;

  return $(`<div class="object-preview">
  <a href="#">
    ${primaryimageurl ? `<img src="${primaryimageurl}" />` : ""}
    ${title ? `<h3>${title}</h3>` : ""}
    ${description ? `<h3>${description}</h3>` : ""}
  </a>
</div>`).data("record", record);
}

function updatePreview(records, info) {
  const root = $("#preview");

  if (info.next) {
    root.find(".next").data("url", info.next).attr("disabled", false);
  } else {
    root.find(".next").data("url", null).attr("disabled", true);
  }

  if (info.prev) {
    root.find(".previous").data("url", info.prev).attr("disabled", false);
  } else {
    root.find(".previous").data("url", null).attr("disabled", true);
  }

  const results = root.find(".results");
  results.empty();

  records.forEach(function (record) {
    results.append(renderPreview(record));
  });
}

function searchURL(searchType, searchString) {
  return `${BASE_URL}/object?${KEY}&${searchType}=${searchString}`;
}

function factHTML(title, content, searchTerm = null) {
  // if content is empty or undefined, return an empty string ''
  if (!content) {
    return "";
  } else if (searchTerm === null) {
    // otherwise, if there is no searchTerm, return the two spans
    return `<span class="title">${title}</span>
<span class="content">${content}</span>`;
  } else {
    // otherwise, return the two spans, with the content wrapped in an anchor tag
    return `<span class="title">${title}</span>
<span class="content"><a href="${searchTerm}">${content}</a></span>`;
  }
}

function photosHTML(images, primaryimageurl) {
  if (images && images.length > 0) {
    // if images is defined AND images.length > 0
    // map the images to the correct image tags, then join them into a single string.
    // the images have a property called baseimageurl, use that as the value for src
    return images
      .map(function (image) {
        return `<img src="${image.baseimageurl}"/>`;
      })
      .join("");
  } else if (primaryimageurl) {
    // else if primaryimageurl is defined, return a single image tag with that as value for src
    return `<img src="${primaryimageurl}"/>`;
  } else {
    // else we have nothing, so return the empty string
    return "";
  }
}

function renderFeature(record) {
  /**
   * We need to read, from record, the following:
   * HEADER: title, dated
   * FACTS: description, culture, style, technique, medium, dimensions, people, department, division, contact, creditline
   * PHOTOS: images, primaryimageurl
   */

  // build and return template
  const {
    title,
    dated,
    description,
    culture,
    style,
    technique,
    medium,
    dimensions,
    people,
    department,
    division,
    contact,
    creditline,
    images,
    primaryimageurl,
  } = record;
  const element = $(`<div class="object-feature">
<header>
  <h3>${title}</h3>
  <h4>${dated}</h4>
</header>
<section class="facts">
${factHTML("Description", description)}
${factHTML("Culture", culture, searchURL("culture", culture))}
${factHTML("Style", style)}
${factHTML("Technique", technique, searchURL("technique", technique))}
${factHTML("Medium", medium, searchURL("medium", medium))}
${factHTML("Dimensions", dimensions)}
${
  people
    ? people
        .map(function (person) {
          return factHTML(
            "Person",
            person.displayname,
            searchURL("person", person.displayname)
          );
        })
        .join("")
    : ""
}
${factHTML("Department", department)}
${factHTML("Division", division)}
${factHTML(
  "Contact",
  `<a target="_blank" href="mailto:${contact}">${contact}</a>`
)}
${factHTML("Creditline", creditline)}
</section>
<section class="photos">
${photosHTML(images, primaryimageurl)}
</section>
</div>`);

  return element;
}

function onFetchStart() {
  $("#loading").addClass("active");
}

function onFetchEnd() {
  $("#loading").removeClass("active");
}

$("#search").on("submit", async function (event) {
  event.preventDefault();
  onFetchStart();

  try {
    const url = buildSearchString();
    const response = await fetch(url);
    const data = await response.json();
    updatePreview(data.records, data.info);
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
});

$("#preview .next, #preview .previous").on("click", async function () {
  onFetchStart();

  try {
    const url = $(this).data("url");
    const response = await fetch(url);
    const data = await response.json();
    updatePreview(data.records, data.info);
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
});

$("#preview").on("click", ".object-preview", function (event) {
  event.preventDefault(); // they're anchor tags, so don't follow the link
  // find the '.object-preview' element by using .closest() from the target
  const select = $(this).closest(".object-preview");
  // recover the record from the element using the .data('record') we attached
  const data = select.data("record");
  // log out the record object to see the shape of the data
  $("#feature").html(renderFeature(data));
});

$("#feature").on("click", "a", async function (event) {
  // read href off of $(this) with the .attr() method
  const href = $(this).attr("href");
  if (href.startsWith("mailto")) {
    return;
  }
  // prevent default
  event.preventDefault();
  // call onFetchStart
  onFetchStart();
  // fetch the href
  // render it into the preview
  // call onFetchEnd
  try {
    const response = await fetch(href);
    const data = await response.json();
    updatePreview(data.records, data.info);
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
});

// fetchObjects().then((x) => console.log(x)); // { info: {}, records: [{}, {},]}
prefetchCategoryLists();
