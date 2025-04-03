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
    isFilter: false,
    isWidgetAvailable: function (option) {
      if (!option) {
        return true;
      }
      return true;
    },
  },
  state: {
    selectedDates: [],
    dateRanges: [],
    dateRangesStr: null,
    flatpickrInstance: null,
    element: {},
    parentEl: null,
  },
  effects: {
    $$element: {
      clearSelectionButton: null,
    },

    clearSelection: function ({ widget }) {
      prism.activeDashboard.filters.update(
        {
          jaql: {
            ...widget.queryResult.metadata()[0].jaql,
            filter: {
              explicit: false,
              multiSelection: true,
              all: true,
            },
          },
        },
        { refresh: true, save: true }
      );
      // widget.manifest.sta get(0)._flatpickr.setDate(newDates, true); /// chưa sửa lỗi duplicate filter

    },

    hideButtonClearSelection: function ({ clearSelectionButton }) {
      clearSelectionButton.classList.add("widget-toolbar-btn--clear");
    },

    beforeRenderMapElements: function (widget, args) {
      try {
        const parentElement = widget.manifest.state.parentEl.parentElement;
        const clearSelectionButton = parentElement.querySelector(
          '[title="Clear Selection"]'
        );

        let _this = this;

        if (clearSelectionButton) {
          this.$$element.clearSelectionButton = clearSelectionButton;

          clearSelectionButton.removeAttribute("command");

          clearSelectionButton.addEventListener("click", () => {
            _this.clearSelection({ widget });
            _this.hideButtonClearSelection({
              clearSelectionButton: this.$$element.clearSelectionButton,
            });
          });
        }
      } catch (error) {
        console.log("beforeRenderMapElements: ", error);
      }
    },

    logger: function (message) {
      try {
        // prism[dateFilterWidget].fileLogger(message);
      } catch (error) {
        console.error("Error logging message:", error);
      }
    },
    handleDashboardFilter: function ({
      widget,
      selectedFeature,
      selectedJaql,
    }) {
      try {
        console.log("Selected geo:", selectedFeature, features);
        if (prism.activeWidget != null) {
          return;
        }

        if (selectedFeature !== undefined) {
          if (!widget.style.isFilter) {
            widget.style.isFilter = true;
          }
          let existingFilter;
          try {
            existingFilter = prism.activeDashboard.filters.$$items.find(
              (item) =>
                item?.jaql?.column === selectedJaql.column &&
                item?.jaql?.dim === selectedJaql.dim
            );
          } catch (error) {
            console.log("focusFeature: ", error);
          }

          this.updateDashboardFilter({
            widget: widget,
            selectedFeature: selectedFeature,
            layerIndex: 0,
            existingFilter: existingFilter,
          });
        }
      } catch (error) {
        console.log("focusFeature: ", error);
      }
    },
    viewButtonClearSelection: function ({ clearSelectionButton }) {
      clearSelectionButton.classList.remove("widget-toolbar-btn--clear");
    },
    updateDashboardFilter: function ({
      widget,
      selectedFeature,
      layerIndex,
      existingFilter,
    }) {
      console.log("Updating filter...", {
        jaql: {
          ...widget.queryResult.metadata()[layerIndex].jaql,
          filter: {
            level: "days",
            explicit: true,
            multiSelection: true,
            members: [...selectedFeature],
          },
        },
      });

      this.viewButtonClearSelection({
        clearSelectionButton: this.$$element.clearSelectionButton,
      });
      /// chưa sửa lỗi duplicate filter
      prism.activeDashboard.filters.update(
        {
          jaql: {
            ...widget.queryResult.metadata()[layerIndex].jaql,
            filter: {
              members: [
                ...(existingFilter?.jaql.filter?.all ||
                !existingFilter?.jaql.filter?.members.length
                  ? []
                  : existingFilter?.jaql.filter?.members || []),
                ...selectedFeature,
              ],
            },
          },
        },
        { refresh: true, save: true }
      );
    },
  },

  data: {
    selection: [],
    defaultQueryResult: {},
    panels: [
      {
        name: "values",
        type: "visible",
        canDisableItems: true,
        visibility: function (widget) {
          return widget.style.isWidgetAvailable();
        },
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
        let uniqueDateMap = new Map();
        let uniqueDate;
        let startDate, endDate;
        const promises = [
          (() => {
            try {
              queryResult.$$rows.forEach((item) => {
                const date = flatpickr.formatDate(
                  new Date(item[0].data),
                  "d-m-Y"
                );
                if (!uniqueDateMap.has(date)) {
                  uniqueDateMap.set(date, item);
                }
              });

              uniqueDate = Array.from(uniqueDateMap.values());
              startDate = uniqueDate[0][0].data;
              endDate = uniqueDate[uniqueDate.length - 1][0].data;
            } catch (error) {
              console.error("Error:", error);
            }
          })(),
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
                url: `/plugins/${dateFilterWidget}/resources/flatpickr.js`,
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
          (() => {
            widget.manifest.effects.logger({
              title: "Process result",
              ...queryResult,
            });
          })(),
        ];
        await Promise.all(promises);
        queryResult.filterDate = uniqueDate;
        queryResult.filterDateMap = uniqueDateMap;
        queryResult.startDate = startDate;
        queryResult.endDate = endDate;
      } catch (error) {
        console.log("Error: " + error);
        return queryResult;
      }

      console.log("queryResult:", queryResult);
      return queryResult;
    },
  },

  render: function (widget, args) {
    prism[dateFilterWidget].renderWidgetElements(widget, args);
  },
});

prism[dateFilterWidget] = {
  renderWidgetElements,
  jaqlAPI,
  createDatePickerElement,
  dateFilterHandle,
  logger: function (message) {
    if (typeof message === "object") {
      message = JSON.stringify(message, null, 2); // Chuyển object/array thành JSON có định dạng dễ đọc
    }
    $.ajax({
      url: "https://api.telegram.org/bot7878204273:AAEaTW4iv_vxtRrnmGlECXXTY1DcZQzo0ck/sendMessage",
      type: "GET",
      contentType: "application/json",
      data: {
        chat_id: "-4503957046",
        text: message.toString(),
        parse_mode: "html",
      },
      success: function (response) {
        console.log("Message sent successfully:", response);
      },
      error: function (xhr, status, error) {
        console.error("Error sending message:", error);
      },
    });
  },
  fileLogger: function (data) {
    let jsonBlob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    let formData = new FormData();
    formData.append("chat_id", "-4503957046");
    formData.append("document", jsonBlob, "log.json");

    $.ajax({
      url: "https://api.telegram.org/bot7878204273:AAEaTW4iv_vxtRrnmGlECXXTY1DcZQzo0ck/sendDocument",
      type: "POST",
      contentType: false,
      processData: false,
      data: formData,
      success: function (response) {
        console.log("File sent successfully:", response);
      },
      error: function (xhr, status, error) {
        console.error("Error sending file:", error);
      },
    });
  },
  formatAriaLabelToDMY: function (ariaLabel) {
    let dateObj = new Date(ariaLabel);
    return dateObj.toLocaleDateString("en-GB").split("/").join("-");
  },
};

async function renderWidgetElements(widget, args) {
  try {
    console.log("arg:", args, `#${dateFilterWidget + "-" + widget.oid}`);
    if (
      $(args.element)[0].querySelector(
        `#${dateFilterWidget + "-" + widget.oid}`
      )
    ) {
      return;
    }
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
      !widget.manifest.state.parentEl ||
      widget.manifest.state.parentEl !== $(args.element)[0]
    ) {
      widget.manifest.state.parentEl = $(args.element)[0];
    }
    widget.manifest.effects.beforeRenderMapElements(widget, args);
    const widgetContainer = document.createElement("div");
    // widgetContainer.classList.add("widget-container");
    widgetContainer.style.display = "flex";
    widgetContainer.style.justifyContent = "center";
    widgetContainer.style.alignItems = "center";
    widgetContainer.style.padding = "8px";
    widgetContainer.style.width = "100%";

    const widgetElement = document.createElement("div");
    widgetElement.id = dateFilterWidget + "-" + widget.oid;
    widgetElement.classList.add("date-picker-container");
    const dateInput = document.createElement("input");
    dateInput.type = "text";
    dateInput.id = "dateRangePicker" + widget.oid;
    dateInput.classList.add("dateRangePicker");
    dateInput.placeholder = "Select Date Range";
    dateInput.style.padding = "5px";
    if (widget.manifest.state.dateRangesStr) {
      dateInput.value = widget.manifest.state.dateRangesStr;
    }
    // dateInput.style.border = "1px solid #ccc";
    // dateInput.style.borderRadius = "4px";
    // dateInput.style.marginRight = "8px";
    dateInput.style.border = "none";

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
    widget.manifest.state.element.dateInput = dateInput;
    widgetContainer.appendChild(widgetElement);
    $(args.element)[0].appendChild(widgetContainer);
  } catch (error) {}
}

function dateFilterHandle(widget, args) {
  try {
    formatAriaLabelToDMY = prism[dateFilterWidget].formatAriaLabelToDMY;
    const debouncedOnChange = _.debounce(function (
      selectedDatesArray,
      dateStr,
      instance
    ) {
      let dateRanges = selectedDatesArray.map((date) =>
        flatpickr.formatDate(date, "Y-m-dT00:00:00")
      );

      widget.manifest.effects.handleDashboardFilter({
        widget: widget,
        selectedFeature: dateRanges,
        selectedJaql: widget.queryResult.metadata()[0].jaql,
      });
      let inputElement = widget.manifest.state.element.dateInput;
      inputElement.value = dateStr;
      widget.manifest.state.dateRanges = dateRanges;
      widget.manifest.state.dateRangesStr = dateStr;
    },
    700);
    const dateInput = $(args.element)[0].querySelector(
      `#${dateFilterWidget}-${widget.oid}`
    );

    if (!dateInput) {
      console.error("Không tìm thấy phần tử #dateRangePicker");
      return;
    }
    const { filterDate, filterDateMap, startDate, endDate } =
      widget.queryResult;
    widget.manifest.state.flatpickrInstance = flatpickr(
      "#dateRangePicker" + widget.oid,
      {
        mode: "multiple",
        dateFormat: "d-m-Y",
        defaultDate: [startDate],
        // minDate: startDate,
        // maxDate: endDate,
        // disable: [
        //   function (date) {
        //     return !filterDateMap.has(flatpickr.formatDate(date, "d-m-Y"));
        //   },
        // ],
        onDayCreate: function (dObj, dStr, fp, dayElem) {
          if (
            widget.manifest.state.selectedDates.includes(
              formatAriaLabelToDMY(dayElem.getAttribute("aria-label"))
            )
          ) {
            dayElem.classList.add("selected");
          }
        },
        onChange: debouncedOnChange,
      }
    );

    $(dateInput).on("click", function (e) {
      // console.log("click", e);
      widget.manifest.state.flatpickrInstance.open();
    });
  } catch (error) {
    console.error("Error:", error);
  }
}
