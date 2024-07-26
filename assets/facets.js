class FacetFiltersForm extends HTMLElement {
  constructor() {
    super();

    this.onActiveFilterClick = this.onActiveFilterClick.bind(this);

    this.debouncedOnSubmit = debounce((event) => {
      this.onSubmitHandler(event);
    }, 500);

    const facetForm = this.querySelector('form');
    facetForm.addEventListener('input', this.debouncedOnSubmit.bind(this));

    const facetWrapper = this.querySelector('#FacetsWrapperDesktop');
    if (facetWrapper) facetWrapper.addEventListener('keyup', onKeyUpEscape);
  }

  static stickyHeader = document.querySelector('sticky-header');

  static setListeners() {
    const onHistoryChange = (event) => {
      const searchParams = event.state ? event.state.searchParams : FacetFiltersForm.searchParamsInitial;
      if (searchParams === FacetFiltersForm.searchParamsPrev) return;
      FacetFiltersForm.renderPage(searchParams, null, false);
    }
    window.addEventListener('popstate', onHistoryChange);
  }

  static toggleActiveFacets(disable = true) {
    document.querySelectorAll('.js-facet-remove').forEach((element) => {
      element.classList.toggle('disabled', disable);
    });
  }

  static onClickDropdownSort(element) {
    if(!element.classList.contains('selected')) {
      const details = element.closest('details');
      const sortByElement = document.getElementById(details.dataset.sort);
      details.querySelector('.selected').classList.remove('selected');
      element.classList.add('selected');
      sortByElement.value = element.dataset.value;
      sortByElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  static renderPage(searchParams, event, updateURLHash = true) {
    if(FacetFiltersForm.stickyHeader) FacetFiltersForm.stickyHeader.preventResize = true;
    FacetFiltersForm.searchParamsPrev = searchParams;
    const sections = FacetFiltersForm.getSections();
    document.getElementById('ProductGridContainer').querySelector('.collection').classList.add('loading');
    
    sections.forEach((section) => {
      const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;
      const filterDataUrl = element => element.url === url;

      FacetFiltersForm.filterData.some(filterDataUrl) ?
        FacetFiltersForm.renderSectionFromCache(filterDataUrl, event) :
        FacetFiltersForm.renderSectionFromFetch(url, event);
    });

    if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);
    if(FacetFiltersForm.stickyHeader) FacetFiltersForm.stickyHeader.preventResize = false;
  }

  static renderSectionFromFetch(url, event) {
    fetch(url)
      .then(response => response.text())
      .then((responseText) => {
        const html = responseText;
        FacetFiltersForm.filterData = [...FacetFiltersForm.filterData, { html, url }];
        FacetFiltersForm.renderFilters(html, event);
        FacetFiltersForm.renderProductGridContainer(html);
        FacetFiltersForm.renderProductCount(html);
      });
  }

  static renderSectionFromCache(filterDataUrl, event) {
    const html = FacetFiltersForm.filterData.find(filterDataUrl).html;
    FacetFiltersForm.renderFilters(html, event);
    FacetFiltersForm.renderProductGridContainer(html);
    FacetFiltersForm.renderProductCount(html);
  }

  static renderProductGridContainer(html) {
    const productGridContainer = document.getElementById('ProductGridContainer');
    productGridContainer.innerHTML = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductGridContainer').innerHTML;
    if(FacetFiltersForm.stickyHeader) FacetFiltersForm.stickyHeader.dispatchEvent(new Event('preventHeaderReveal'));
    productGridContainer.scrollIntoView({behavior: 'smooth'});
  }

  static renderProductCount(html) {
    const count = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductCount').innerHTML
    const container = document.getElementById('ProductCount');
    const containerDesktop = document.getElementById('ProductCountDesktop');
    container.innerHTML = count;
    container.classList.remove('loading');
    if (containerDesktop) {
      containerDesktop.innerHTML = count;
      containerDesktop.classList.remove('loading');
    }
  }

  static renderFilters(html, event) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');

    const facetDetailsElements =
      parsedHTML.querySelectorAll('#FacetFiltersForm .js-filter, #FacetFiltersFormMobile .js-filter, #FacetFiltersPillsForm .js-filter');
    const matchesIndex = (element) => {
      const jsFilter = event ? event.target.closest('.js-filter') : undefined;
      return jsFilter ? element.dataset.index === jsFilter.dataset.index : false;
    }
    const facetsToRender = Array.from(facetDetailsElements).filter(element => !matchesIndex(element));
    const countsToRender = Array.from(facetDetailsElements).find(matchesIndex);

    facetsToRender.forEach((element) => {
      const realElement = document.querySelector(`.js-filter[data-index="${element.dataset.index}"]`);
      realElement.innerHTML = element.innerHTML;
    });

    FacetFiltersForm.renderActiveFacets(parsedHTML);
    FacetFiltersForm.renderAdditionalElements(parsedHTML);
    
    if (countsToRender) FacetFiltersForm.renderCounts(countsToRender, event.target.closest('.js-filter'));
  }

  static renderActiveFacets(html) {
    const activeFacetElementSelectors = ['.active-facets-mobile', '.active-facets-desktop'];

    activeFacetElementSelectors.forEach((selector) => {
      const activeFacetsElement = html.querySelector(selector);
      if (!activeFacetsElement) return;
      document.querySelector(selector).innerHTML = activeFacetsElement.innerHTML;
    })

    FacetFiltersForm.toggleActiveFacets(false);
  }

  static renderAdditionalElements(html) {
    const mobileElementSelectors = ['.mobile-facets__open', '.mobile-facets__count', '.sorting'];

    mobileElementSelectors.forEach((selector) => {
      if (!html.querySelector(selector)) return;
      document.querySelector(selector).innerHTML = html.querySelector(selector).innerHTML;
    });

    document.getElementById('FacetFiltersFormMobile').closest('menu-drawer').bindEvents();
  }

  static renderCounts(source, target) {
    const targetElement = target.querySelector('.facets__selected');
    const sourceElement = source.querySelector('.facets__selected');

    const targetElementAccessibility = target.querySelector('.facets__summary');
    const sourceElementAccessibility = source.querySelector('.facets__summary');
    if (sourceElement && targetElement) {
      target.querySelector('.facets__selected').outerHTML = source.querySelector('.facets__selected').outerHTML;
    }
    if (targetElementAccessibility && sourceElementAccessibility) {
      target.querySelector('.facets__summary').outerHTML = source.querySelector('.facets__summary').outerHTML;
    }
  }

  static updateURLHash(searchParams) {
    history.pushState({ searchParams }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
  }

  static getSections() {
    return [
      {
        section: document.getElementById('product-grid').dataset.id,
      }
    ]
  }

  createSearchParams(form) {
    const formData = new FormData(form);
    const gtePrice = form.querySelector('.field__input--price-gte');
    if(gtePrice && gtePrice.value == gtePrice.min) {
      formData.delete(gtePrice.name);
    }
    
    const ltePrice = form.querySelector('.field__input--price-lte');
    if(ltePrice && (ltePrice.value * 1.00) == (ltePrice.max * 1.00)) {
      formData.delete(ltePrice.name);
    }
    return new URLSearchParams(formData).toString();
  }
  
  onSubmitForm(searchParams, event) {
    FacetFiltersForm.renderPage(searchParams, event);
  }

  onSubmitHandler(event) {
    event.preventDefault();
    const sortFilterForms = document.querySelectorAll('facet-filters-form form');
    if (event.srcElement.className == 'mobile-facets__checkbox') {
      const searchParams = this.createSearchParams(event.target.closest('form'))
      this.onSubmitForm(searchParams, event)
    } else {
      const forms = [];
      const isMobile = event.target.closest('form').id === 'FacetFiltersFormMobile';
      sortFilterForms.forEach((form) => {
        if (!isMobile) {
          if (form.id === 'FacetSortForm' || form.id === 'FacetFiltersForm' || form.id === 'FacetSortDrawerForm') {
            const noJsElements = document.querySelectorAll('.no-js-list');
            noJsElements.forEach((el) => el.remove());
            forms.push(this.createSearchParams(form));
          }
        } else if (form.id === 'FacetFiltersFormMobile') {
          forms.push(this.createSearchParams(form));
        }
      });
      this.onSubmitForm(forms.join('&'), event)
    }
  }

  onActiveFilterClick(event) {
    event.preventDefault();
    FacetFiltersForm.toggleActiveFacets();
    const url = event.currentTarget.href.indexOf('?') == -1 ? '' : event.currentTarget.href.slice(event.currentTarget.href.indexOf('?') + 1);
    FacetFiltersForm.renderPage(url);
  }
}

FacetFiltersForm.filterData = [];
FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);
customElements.define('facet-filters-form', FacetFiltersForm);
FacetFiltersForm.setListeners();

function getElementStyle(element, property) {
  return window.getComputedStyle ? window.getComputedStyle(element, null).getPropertyValue(property) : element.style[property.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); })];
}

class PriceRange extends HTMLElement {
  constructor() {
    super();
    this.querySelectorAll('input:not([type="range"])')
      .forEach(element => element.addEventListener('change', this.onRangeChange.bind(this)));
    this.querySelectorAll('input[type="range"]').forEach(element => {
      element.addEventListener('input', this.onRangeSliderInput.bind(this));
    });  
    this.setMinAndMaxValues();
  }

  onRangeSliderInput(event) {
    const remainInput = document.getElementById(event.target.dataset.rangeInput);
    let delta = 0;
    if(event.target.classList.contains('range-slider__input--lower')) {
      if(Number.parseInt(event.target.value) >= Number.parseInt(remainInput.value)) {
        delta = -1;
      }
    } else {
      if(Number.parseInt(event.target.value) <= Number.parseInt(remainInput.value)) {
        delta = 1;
      }
    }
    if(delta == 0) {
      this.calculateRangeUsedBarWidth(event.target);
    } else {
      event.target.value = Number.parseInt(remainInput.value) + delta;
    }
    document.getElementById(event.target.dataset.input).value = event.target.value / 100;

    const rangeValueElement = document.getElementById(event.target.dataset.rangeValue);
    rangeValueElement.innerHTML = Shopify.showPrice(event.target.value);
  }

  onRangeChange(event) {
    this.adjustToValidValues(event.currentTarget);
    this.setMinAndMaxValues();
    const rangeInputElement = document.getElementById(event.target.dataset.rangeInput);
    rangeInputElement.value = event.target.value;
    this.calculateRangeUsedBarWidth(rangeInputElement);
  }

  calculateRangeUsedBarWidth(rangeInput) {
    const value = Number(rangeInput.value);
    const max = Number(rangeInput.getAttribute('max'));
    let rangeUsedBarWidth;
    if(rangeInput.classList.contains('range-slider__input--lower')) {
      rangeUsedBarWidth = (value * 100.00) / max;
      rangeInput.previousElementSibling.style.setProperty('--range-used-bar-width', rangeUsedBarWidth + '%');
    } else {
      const min = Number(rangeInput.getAttribute('min'));
      rangeUsedBarWidth = ((max - value) * 100.00) / (max - min);
      rangeInput.nextElementSibling.style.setProperty('--range-used-bar-width', rangeUsedBarWidth + '%');
    }
  }

  setMinAndMaxValues() {
    const inputs = this.querySelectorAll('input:not([type="range"])');
    const minInput = inputs[0];
    const maxInput = inputs[1];
    if (maxInput.value) minInput.setAttribute('max', maxInput.value);
    if (minInput.value) maxInput.setAttribute('min', minInput.value);
    if (minInput.value === '') maxInput.setAttribute('min', 0);
    if (maxInput.value === '') minInput.setAttribute('max', maxInput.getAttribute('max'));
  }

  adjustToValidValues(input) {
    const value = Number(input.value);
    const min = Number(input.getAttribute('min'));
    const max = Number(input.getAttribute('max'));

    if (value < min) input.value = min;
    if (value > max) input.value = max;
  }
}

customElements.define('price-range', PriceRange);

class FacetRemove extends HTMLElement {
  constructor() {
    super();
    const facetLink = this.querySelector('a');
    facetLink.setAttribute('role', 'button');
    facetLink.addEventListener('click', this.closeFilter.bind(this));
    facetLink.addEventListener('keyup', (event) => {
      event.preventDefault();
      if (event.code.toUpperCase() === 'SPACE') this.closeFilter(event);
    });
  }
  closeFilter(event) {
    event.preventDefault();
      const form = this.closest('facet-filters-form') || document.querySelector('facet-filters-form');
      form.onActiveFilterClick(event);
  }
}

customElements.define('facet-remove', FacetRemove);
