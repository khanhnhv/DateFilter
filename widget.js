var dateFilterWidget = "dateFilterWidget";
var dateFilterTitle = "Date-picker";
var dateFilterPriority = 12;
prism.registerWidget(dateFilterWidget, {
  name: dateFilterWidget,
  family: "trees",
  title: dateFilterTitle,
  priority: dateFilterPriority,
  iconSmall: `/plugins/${dateFilterWidget}/widget-24.png`,
  styleEditorTemplate: null,
  style: {
    treeData: null,
    isWidgetAvailable: function (option) {
      if (!option) {
        return true;
      }
      // return isTenantAvailableToUseWidget(prism.user.tenantId, option);
      return true;
    },
  },
  state: {
    chart: null,
  },
  data: {
    selection: [],
    defaultQueryResult: {},
    panels: [
      {
        name: "values",
        type: "visible",
        canDisableItems: true,
        // itemAttributes: ["color", "nullzero"],
        visibility: function (widget) {
          return widget.style.isWidgetAvailable();
        },
        // allowedColoringTypes: function (widget) {
        //   return {
        //     color: true,
        //     range: true,
        //     condition: true,
        //   };
        // },
        metadata: {
          types: ["dimensions", "measures"],
          maxitems: 1,
          mixed: true,
          sortable: {
            maxitems: 1,
          },
        },
      },
      {
        name: "filters",
        type: "filters",
        metadata: {
          types: ["dimensions"],
          maxitems: -1,
        },
      },
    ],

    allocatePanel: function (widget, metadataItem) {
      // measure
      if (
        prism.$jaql.isMeasure(metadataItem) &&
        widget.metadata.panel("values").items.length === 0
      ) {
        return "values";
      }
    },

    isSupported: function (items) {
      return this.rankMetadata(items, null, null) > -1;
    },

    rankMetadata: function (items, type, subtype) {
      var a = prism.$jaql.analyze(items);

      // require 1 measure and 1 to 3 dimensions
      if (
        a.measures.length == 1 &&
        a.dimensions.length > 0 &&
        a.dimensions.length <= 3
      ) {
        return 0;
      }

      return -1;
    },

    canColor: function (widget, panel, item) {
      return panel.name === "values";
    },

    initialized: async function (widget, queryResult, n, e, f) {
      console.log("initialized:", widget, queryResult, n, e, f);
    },

    populateMetadata: function (widget, items) {
      var a = prism.$jaql.analyze(items);

      // allocating dimensions
      widget.metadata.panel("values").push(a.measures);

      // allocating filters
      widget.metadata.panel("filters").push(a.filters);
    },

    buildQuery: function (widget) {
      var query = { datasource: widget.datasource, metadata: [] };

      widget.metadata.panel("values").items.forEach(function (item) {
        query.metadata.push(item);
      });

      // series - dimensions
      widget.metadata.panel("filters").items.forEach(function (item) {
        item = $$.object.clone(item, true);
        item.panel = "scope";

        query.metadata.push(item);
      });

      return query;
    },

    // prepares the widget-specific query result from the given result data-table
    processResult: async function (widget, queryResult) {
      try {
        const promises = [
          (async () => {})(),
          (async () => {
            if (true) {
              return $.ajax({
                type: "GET",
                url: `/plugins/${dateFilterWidget}/resources/daterangepicker.min.js`,
                dataType: "script",
                cache: true,
              });
            }
          })(),
          (async () => {
            if (true) {
              return $.ajax({
                type: "GET",
                url: `/plugins/${dateFilterWidget}/resources/moment.min.js`,
                dataType: "script",
                cache: true,
              });
            }
          })(),
        ];
        await Promise.all(promises);
      } catch (error) {
        console.log("Error: " + error);
        return queryResult;
      }
      return queryResult;
    },
  },
  render: function (widget, args) {
    prism[dateFilterWidget].renderMapElements(widget, args);
  },
});

prism[dateFilterWidget] = {
  renderMapElements,
  jaqlAPI,
  createDatePickerElement,
  dateFilterHandle
};

async function renderMapElements(widget, args) {
  const a = [
    { date: "2025-03-08T04:50:48.122Z", data: "1" },
    { date: "2025-03-09T04:50:48.122Z", data: "2" },
    { date: "2025-03-10T04:50:48.122Z", data: "3" },
    { date: "2025-03-11T04:50:48.122Z", data: "4" },
    { date: "2025-03-12T04:50:48.122Z", data: "5" },
    { date: "2025-03-13T04:50:48.122Z", data: "6" },
    { date: "2025-03-18T04:50:48.122Z", data: "11" },
    { date: "2025-03-18T04:50:48.122Z", data: "112312" },
    { date: "2025-03-25T04:50:48.122Z", data: "18" },
    { date: "2025-04-26T04:50:48.122Z", data: "19" },
  ];

  const uniqueData = a.reduce((acc, item) => {
    const date = moment(item.date).format("YYYY-MM-DD");
    if (!acc.find((el) => moment(el.date).format("YYYY-MM-DD") === date)) {
      acc.push(item);
    }
    return acc;
  }, []);
  try {
    console.log("arg:", args, `#${dateFilterWidget + "-" + widget.oid}`);
    prism[dateFilterWidget].createDatePickerElement(widget, args);
    prism[dateFilterWidget].dateFilterHandle(widget, args);
  } catch (error) {
    console.log("render error:", error);
  }
}

function jaqlAPI(jaql) {
  // Use $internalHttp service if exists
  const $internalHttp = prism.$injector.has("base.factories.internalHttp")
    ? prism.$injector.get("base.factories.internalHttp")
    : null;
  // Ajax configurations
  const ajaxConfig = {
    url:
      "/api/datasources/" + encodeURIComponent(jaql.datasource.title) + "/jaql",
    method: "POST",
    data: JSON.stringify(jaql),
    contentType: "application/json",
    dataType: "json",
    async: false,
  };
  // Use $internalHttp service
  // else use default ajax request
  const httpPromise = $internalHttp
    ? $internalHttp(ajaxConfig, true)
    : $.ajax(ajaxConfig);

  // Return response
  return httpPromise;
}

function createDatePickerElement(widget, args) {
  try {
    if (
      $(args.element)[0].querySelector(
        `#${dateFilterWidget + "-" + widget.oid}`
      )
    ) {
      return;
    }
    const widgetElement = document.createElement("div");
    widgetElement.id = dateFilterWidget + "-" + widget.oid;
    widgetElement.classList.add("date-picker-container");
    const dateInput = document.createElement("input");
    dateInput.type = "text";
    dateInput.id = "dateRangePicker";
    dateInput.placeholder = "Select Date Range";
    dateInput.style.padding = "5px";
    // dateInput.style.border = "1px solid #ccc";
    // dateInput.style.borderRadius = "4px";
    // dateInput.style.marginRight = "8px";
    dateInput.style.border = "none"

    // Tạo icon SVG mũi tên xuống
    const svgElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    svgElement.setAttribute("viewBox", "0 0 11 6");
    svgElement.setAttribute("fill", "none");
    svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svgElement.classList.add("arrow-down");
    svgElement.style.width = "16px";
    svgElement.style.height = "16px";

    const pathElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    pathElement.setAttribute(
      "d",
      "M9.78996 1.30495L6.25829 4.83661C5.84121 5.2537 5.15871 5.2537 4.74163 4.83661L1.20996 1.30495"
    );
    pathElement.setAttribute("stroke", "#797D8A");
    pathElement.setAttribute("stroke-width", "1.5");
    pathElement.setAttribute("stroke-miterlimit", "10");
    pathElement.setAttribute("stroke-linecap", "round");
    pathElement.setAttribute("stroke-linejoin", "round");

    svgElement.appendChild(pathElement);

    // Tạo wrapper chứa input và icon
    const inputWrapper = document.createElement("div");
    inputWrapper.style.display = "flex";
    inputWrapper.style.alignItems = "center";
    // inputWrapper.appendChild(dateInput);
    // inputWrapper.appendChild(svgElement);

    // Thêm vào widget container
    // widgetElement.appendChild(inputWrapper);
    widgetElement.appendChild(dateInput);
    widgetElement.appendChild(svgElement);
    $(args.element)[0].appendChild(widgetElement);
  } catch (error) {}
}

function dateFilterHandle(widget, args) {
  try {
    const dateInput = $(args.element)[0].querySelector(`#${dateFilterWidget}-${widget.oid}`);

    if (!dateInput) {
      console.error("Không tìm thấy phần tử #dateRangePicker");
      return;
    }

    $(dateInput).daterangepicker(
      {
        locale: { format: "DD/MM/YYYY", cancelLabel: "Clear" },
        isCustomDate: function (date) {
          // return validDates.includes(date.format("YYYY-MM-DD"))
          //   ? ""
          //   : "gray-out";
          return "gray-out"
        },
      },
      function (start, end) {
        console.log("start:", start.format("YYYY-MM-DD"));
        console.log("end:", end.format("YYYY-MM-DD"));
        // const filteredData = uniqueData.filter((item) => {
        //   const itemDate = moment(item.date).format("YYYY-MM-DD");
        //   return (
        //     itemDate >= start.format("YYYY-MM-DD") &&
        //     itemDate <= end.format("YYYY-MM-DD")
        //   );
        // });

        // if (filteredData.length === 0) {
        //   $(dateInput).val("");
        // } else {
        //   console.log(filteredData);
        // }
      }
    );

    // Xử lý sự kiện "Clear"
    $(dateInput).on("cancel.daterangepicker", function (ev, picker) {
      $(this).val("");
    });

    // Khi click vào toàn bộ wrapper, mở date picker
    $(dateInput)[0]
      .querySelector("#dateRangePicker")
      .click(function () {
        $(dateInput).click();
      });
  } catch (error) {
    console.error("Error:", error);
  }
}
