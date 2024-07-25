function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}

function initEventSummary(wrapper) {
  wrapper.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
    summary.setAttribute('role', 'button');
    summary.setAttribute('aria-expanded', summary.parentNode.hasAttribute('open'));
  
    if(summary.nextElementSibling.getAttribute('id')) {
      summary.setAttribute('aria-controls', summary.nextElementSibling.id);
    }
  
    summary.addEventListener('click', (event) => {
      event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
    });
  
    if (summary.closest('header-drawer')) return;
    summary.parentElement.addEventListener('keyup', onKeyUpEscape);
  });
}

initEventSummary(document);

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (
      event.target !== container &&
      event.target !== last &&
      event.target !== first
    )
    return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function() {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function(event) {
    if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if (
      (event.target === container || event.target === first) &&
      event.shiftKey
    ) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  elementToFocus.focus();
}

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
  document.querySelector(":focus-visible");
} catch(e) {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = ['ARROWUP', 'ARROWDOWN', 'ARROWLEFT', 'ARROWRIGHT', 'TAB', 'ENTER', 'SPACE', 'ESCAPE', 'HOME', 'END', 'PAGEUP', 'PAGEDOWN']
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener('keydown', (event) => {
    if(navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener('mousedown', (event) => {
    mouseClick = true;
  });

  window.addEventListener('focus', () => {
    if (currentFocusedElement) currentFocusedElement.classList.remove('focused');

    if (mouseClick) return;

    currentFocusedElement = document.activeElement;
    currentFocusedElement.classList.add('focused');

  }, true);
}

function pauseAllMedia(wrapper = document, includeProductModel = true) {
  wrapper.querySelectorAll('.js-youtube').forEach((video) => {
    video.contentWindow.postMessage('{"event":"command","func":"' + 'pauseVideo' + '","args":""}', '*');
  });
  wrapper.querySelectorAll('.js-vimeo').forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', '*');
  });
  wrapper.querySelectorAll('video:not(.video--background)').forEach((video) => video.pause());
  if(includeProductModel) {
    wrapper.querySelectorAll('product-model').forEach((model) => {
      if (model.modelViewerUI) model.modelViewerUI.pause();
    });
  }
}

function updateProductMediaStatus(wrapper) {
  wrapper.querySelectorAll('.product__media img').forEach(e => {
    if(e.complete) {
      addLoadedImageStatus(e);
    } else {
      e.onload = () => {
        addLoadedImageStatus(e);
      };
    }
  });
}

function addLoadedImageStatus(image) {
  const parentElement = image.parentElement;
  if(!parentElement.classList.contains('loaded')) {
    parentElement.classList.add('loaded');
    if(parentElement.nextElementSibling) {
      setTimeout(() => parentElement.nextElementSibling.remove(), 500);
    }
  }
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function onKeyUpEscape(event) {
  if (!event.code || event.code.toUpperCase() !== 'ESCAPE') return;

  const openDetailsElement = event.target.closest('details[open]');
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector('summary');
  openDetailsElement.removeAttribute('open');
  summaryElement.setAttribute('aria-expanded', false);
  summaryElement.focus();
}

function loadColorSwatches() {
  window.loadedBackgroundColorSwatches = true;
  fetch(window.Shopify.routes.root + `?section_id=background-color-swatches`)
  .then(res => res.text())
  .then((html) => {
    document.body.appendChild(getDomHtmlFromText(html, 'style'));
  });
}

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function fetchConfig(type = 'json', method = 'POST') {
  return {
    method: method,
    headers: { 'Content-Type': 'application/json', 'Accept': `application/${type}` }
  };
}

function parseHtml(text) {
  return new DOMParser().parseFromString(text, 'text/html');
}

function getDomHtmlFromText(text, selector) {
  return parseHtml(text)
      .querySelector(selector);
}

function getInnerHtmlFromText(text, selector) {
  return getDomHtmlFromText(text, selector).innerHTML;
}

function closeDetailsInAnimation(detailsElement) {
  let animationStart;

  const handleAnimation = (time) => {
    if (animationStart === undefined) {
      animationStart = time;
    }

    const elapsedTime = time - animationStart;

    if (elapsedTime < 400) {
      window.requestAnimationFrame(handleAnimation);
    } else {
      detailsElement.removeAttribute('open');
      if (detailsElement.closest('details[open]')) {
        trapFocus(detailsElement.closest('details[open]'), detailsElement.querySelector('summary'));
      }
    }
  }

  window.requestAnimationFrame(handleAnimation);
}

/*
 * Shopify Common JS
 *
 */
if ((typeof window.Shopify) == 'undefined') {
  window.Shopify = {};
}

Shopify.bind = function(fn, scope) {
  return function() {
    return fn.apply(scope, arguments);
  }
};

Shopify.setSelectorByValue = function(selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function(target, eventName, callback) {
  target.addEventListener ? target.addEventListener(eventName, callback, false) : target.attachEvent('on'+eventName, callback);
};

Shopify.postLink = function(path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};

  var form = document.createElement("form");
  form.setAttribute("method", method);
  form.setAttribute("action", path);

  for(var key in params) {
    var hiddenField = document.createElement("input");
    hiddenField.setAttribute("type", "hidden");
    hiddenField.setAttribute("name", key);
    hiddenField.setAttribute("value", params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function(country_domid, province_domid, options) {
  this.countryEl         = document.getElementById(country_domid);
  this.provinceEl        = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(options['hideElement'] || province_domid);
  Shopify.addListener(this.countryEl, 'change', Shopify.bind(this.countryHandler,this));

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function() {
    var value = this.countryEl.getAttribute('data-default');
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function() {
    var value = this.provinceEl.getAttribute('data-default');
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function(e) {
    var opt       = this.countryEl.options[this.countryEl.selectedIndex];
    var raw       = opt.getAttribute('data-provinces');
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = 'none';
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement('option');
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }

      this.provinceContainer.style.display = "";
    }
  },

  clearOptions: function(selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function(selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  }
};

Shopify.formatMoney = function(t, e) {
  function n(t, e) {
    return void 0 === t ? e : t
  }

  function o(t, e, o, i) {
    if (e = n(e, 2), o = n(o, ","), i = n(i, "."), isNaN(t) || null == t) return 0;
    var r = (t = (t / 100).toFixed(e)).split(".");
    return r[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + o) + (r[1] ? i + r[1] : "")
  }
  "string" == typeof t && (t = t.replace(".", ""));
  var i = "",
      r = /\{\{\s*(\w+)\s*\}\}/,
      a = e || moneyFormat;
  switch (a.match(r)[1]) {
    case "amount":
        i = o(t, 2);
        break;
    case "amount_no_decimals":
        i = o(t, 0);
        break;
    case "amount_with_comma_separator":
        i = o(t, 2, ".", ",");
        break;
    case "amount_with_space_separator":
        i = o(t, 2, " ", ",");
        break;
    case "amount_with_period_and_space_separator":
        i = o(t, 2, " ", ".");
        break;
    case "amount_no_decimals_with_comma_separator":
        i = o(t, 0, ".", ",");
        break;
    case "amount_no_decimals_with_space_separator":
        i = o(t, 0, " ");
        break;
    case "amount_with_apostrophe_separator":
        i = o(t, 2, "'", ".")
  }
  return a.replace(r, i)
}

Shopify.showPrice = function(price, noConvert = false) {
  return (!noConvert) ? Shopify.formatMoney(price * Shopify.currency.rate) : Shopify.formatMoney(price);
}

class HTMLUpdateUtility {
  /**
   * Used to swap an HTML node with a new node.
   * The new node is inserted as a previous sibling to the old node, the old node is hidden, and then the old node is removed.
   *
   * The function currently uses a double buffer approach, but this should be replaced by a view transition once it is more widely supported https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
   */
  static viewTransition(oldNode, newContent, preProcessCallbacks = [], postProcessCallbacks = []) {
    preProcessCallbacks?.forEach((callback) => callback(newContent));

    const newNodeWrapper = document.createElement('div');
    HTMLUpdateUtility.setInnerHTML(newNodeWrapper, newContent.outerHTML);
    const newNode = newNodeWrapper.firstChild;

    // dedupe IDs
    const uniqueKey = Date.now();
    oldNode.querySelectorAll('[id], [form]').forEach((element) => {
      element.id && (element.id = `${element.id}-${uniqueKey}`);
      element.form && element.setAttribute('form', `${element.form.getAttribute('id')}-${uniqueKey}`);
    });

    oldNode.parentNode.insertBefore(newNode, oldNode);
    oldNode.style.display = 'none';

    postProcessCallbacks?.forEach((callback) => callback(newNode));

    setTimeout(() => oldNode.remove(), 500);
  }

  // Sets inner HTML and reinjects the script tags to allow execution. By default, scripts are disabled when using element.innerHTML.
  static setInnerHTML(element, html) {
    element.innerHTML = html;
    HTMLUpdateUtility.reinjectsScripts(element);
  }

  static reinjectsScripts(element) {
    element.querySelectorAll('script').forEach(oldScriptTag => {
      const newScriptTag = document.createElement('script');
      Array.from(oldScriptTag.attributes).forEach(attribute => {
        newScriptTag.setAttribute(attribute.name, attribute.value)
      });
      newScriptTag.appendChild(document.createTextNode(oldScriptTag.innerHTML));
      oldScriptTag.parentNode.replaceChild(newScriptTag, oldScriptTag);
    });
  }
}

class DrawerFixed extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close(evt));
    this.stickyHeader = document.querySelector('sticky-header');
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);
    // here the animation doesn't seem to always get triggered. A timeout seem to help
    setTimeout(() => {this.classList.add('animate', 'active')});

    this.addEventListener('transitionend', () => {
      const containerToTrapFocusOn = this.classList.contains('is-empty') ? this.querySelector('.drawer__inner-empty') : (this.classList.contains('drawer--cart') ? document.getElementById('CartDrawer') : document.getElementById('QuickAddDrawer'));
      const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
      trapFocus(containerToTrapFocusOn, focusElement);
    }, { once: true });

    document.body.classList.add('open-drawer-fixed');
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return getInnerHtmlFromText(html, selector);
  }

  getSectionDOM(html, selector = '.shopify-section') {
    return getDomHtmlFromText(html, selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }

  close(evt) {
    this.classList.remove('active');
    removeTrapFocus(this.activeElement);
    document.body.classList.remove('open-drawer-fixed');
    setTimeout(() => {
      document.body.dispatchEvent(new CustomEvent('drawerClosed'));
    }, 500);   
  }
}

class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.querySelector('[id^="ModalClose-"]').addEventListener(
      'click',
      this.hide.bind(this, false)
    );
    this.addEventListener('keyup', (event) => {
      if (event.code.toUpperCase() === 'ESCAPE') this.hide();
    });
    if (this.classList.contains('media-modal')) {
      this.addEventListener('pointerup', (event) => {
        if (event.pointerType === 'mouse' && !event.target.closest('deferred-media, product-model')) this.hide();
      });
    } else {
      this.addEventListener('click', (event) => {
        if (event.target === this) this.hide();
      });
    }
  }

  connectedCallback() {
    if (this.moved) return;
    this.moved = true;
    document.body.appendChild(this);
  }

  show(opener) {
    this.removeAttribute('hidden');
    this.openedBy = opener;
    const popup = this.querySelector('.template-popup');
    document.body.classList.add('overflow-hidden');
    this.setAttribute('open', '');
    if (popup) popup.loadContent();
    trapFocus(this, this.querySelector('[role="dialog"]'));
    window.pauseAllMedia();
  }

  hide() {
    this.classList.add('closing');
    setTimeout(() => {
      document.body.classList.remove('overflow-hidden');
      document.body.dispatchEvent(new CustomEvent('modalClosed'));
      this.removeAttribute('open');
      removeTrapFocus(this.openedBy);
      window.pauseAllMedia();
      this.classList.remove('closing');
    }, 600);
  }
}
customElements.define('modal-dialog', ModalDialog);

class ModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector('button');

    if (!button) return;
    button.addEventListener('click', () => {
      const modal = document.querySelector(this.dataset.modal);
      if (modal) modal.show(button);
    });
  }
}
customElements.define('modal-opener', ModalOpener);

class SliderComponent extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.init();
  }

  init() {
    this.slider = this.querySelector('[id^="Slider-"]');
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.enableSliderLooping = false;
    this.currentPageElement = this.querySelector('.slider-counter--current');
    this.pageTotalElement = this.querySelector('.slider-counter--total');
    this.prevButton = (this.dataset.outsidePrevButtonId != undefined ? this.closest('[id^="shopify-section"]').querySelector(`#${this.dataset.outsidePrevButtonId}`) : this.querySelector('button[name="previous"]'));
    this.nextButton = (this.dataset.outsideNextButtonId != undefined ? this.closest('[id^="shopify-section"]').querySelector(`#${this.dataset.outsideNextButtonId}`) : this.querySelector('button[name="next"]'));
    this.isAutoplay = this.slider.dataset.autoplay === 'true';
    this.autoplayButtonQuerySelector = '.slider__autoplay';
    this.autoPlayPausedClass = 'slider__autoplay--paused';
    this.sliderControlButtons = this.querySelectorAll('.slider-counter__link');
    
    if (!this.slider) return;
    this.sliderFirstItemNode = this.slider.querySelector('.slider__slide');

    this.initPages();
    
    if(this.nextButton) {
      this.onButtonClickHandler = this.onButtonClick.bind(this);
      this.prevButton.addEventListener('click', this.onButtonClickHandler);
      this.nextButton.addEventListener('click', this.onButtonClickHandler);
    }

    if (this.isAutoplay) this.setAutoPlay();

    if(this.sliderControlButtons) {
      this.sliderControlLinksArray = Array.from(this.sliderControlButtons);
      this.sliderControlLinksArray.forEach(link => link.addEventListener('click', this.linkToSlide.bind(this)));
    }

    window.addEventListener('resize', debounce((event) => {
      this.initPages();
    }), true);
    
    this.slider.addEventListener('scroll', this.update.bind(this));
  }

  disconnectedCallback() {
    if(this.nextButton) {
      this.prevButton.removeEventListener('click', this.onButtonClickHandler);
      this.nextButton.removeEventListener('click', this.onButtonClickHandler);
    }
  }

  initPages() {
    this.sliderItemsToShow = Array.from(this.sliderItems).filter(element => element.clientWidth > 0);
    if (this.sliderItemsToShow.length < 2) return;
    this.sliderItemOffset = this.sliderItemsToShow[1].offsetLeft - this.sliderItemsToShow[0].offsetLeft;
    const slidersPerPageInFloat = (this.slider.clientWidth - this.sliderItemsToShow[0].offsetLeft) / this.sliderItemOffset;
    this.slidesPerPage = Math.ceil(slidersPerPageInFloat);
    this.totalPages = Math.ceil(this.sliderItemsToShow.length / this.slidesPerPage);
    
    if (this.sliderControlButtons.length) {
      const limit = this.sliderItemsToShow.length - this.slidesPerPage;
      this.sliderControlButtons.forEach((link, indexLink) => {
        link.classList.remove('hidden');
        if(indexLink > limit) {
          link.classList.add('hidden');
        }
      });
    }
    this.update();
  }

  resetPages() {
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.initPages();
  }

  update() {
    const previousPage = this.currentPage;
    this.currentPage = Math.round(this.slider.scrollLeft / this.sliderItemOffset) + 1;

    if (this.currentPageElement && this.pageTotalElement) {
      this.currentPageElement.textContent = this.currentPage;
      this.pageTotalElement.textContent = this.totalPages;
    }

    if (this.currentPage && this.currentPage != previousPage) {
      this.dispatchEvent(new CustomEvent('slideChanged', { detail: {
        currentPage: this.currentPage,
        currentElement: this.sliderItemsToShow[this.currentPage - 1]
      }}));
    }

    if (this.sliderControlButtons.length) {
      this.sliderControlButtons.forEach(link => {
        link.classList.remove('slider-counter__link--active');
        link.removeAttribute('aria-current');
      });
  
      this.sliderControlButtons[this.currentPage - 1].classList.add('slider-counter__link--active');
      this.sliderControlButtons[this.currentPage - 1].setAttribute('aria-current', true);
    }

    if (this.isAutoplay && this.autoplayButtonIsSetToPlay) this.play();

    if (this.enableSliderLooping || !this.nextButton) return;

    if (this.isSlideVisible(this.sliderItemsToShow[0]) && this.slider.scrollLeft === 0) {
      this.prevButton.setAttribute('disabled', 'disabled');
    } else {
      this.prevButton.removeAttribute('disabled');
    }

    if (this.isSlideVisible(this.sliderItemsToShow[this.sliderItemsToShow.length - 1])) {
      this.nextButton.setAttribute('disabled', 'disabled');
    } else {
      this.nextButton.removeAttribute('disabled');
    }
  }

  isSlideVisible(element, offset = 0) {
    const lastVisibleSlide = this.slider.clientWidth + this.slider.scrollLeft - offset;
    return (element.offsetLeft + element.clientWidth - 1) <= lastVisibleSlide && element.offsetLeft >= this.slider.scrollLeft;
  }

  setAutoPlay() {
    this.sliderAutoplayButton = this.querySelector(this.autoplayButtonQuerySelector);
    this.autoplaySpeed = this.slider.dataset.speed * 1000;
    if(this.sliderAutoplayButton) {
      this.sliderAutoplayButton.addEventListener('click', this.autoPlayToggle.bind(this));
    }

    this.play();
    this.autoplayButtonIsSetToPlay = true;
  }

  linkToSlide(event) {
    event.preventDefault();
    this.goToSlideByTarget(event.currentTarget);
  }

  goToSlideByTarget(target) {
    const slideScrollPosition = this.slider.scrollLeft + this.sliderItemOffset * (this.sliderControlLinksArray.indexOf(target) + 1 - this.currentPage);
    this.slider.scrollTo({
      left: slideScrollPosition
    });
  }

  autoPlayToggle() {
    this.togglePlayButtonState();
    this.autoplayButtonIsSetToPlay ? this.pause() : this.play();
    this.autoplayButtonIsSetToPlay = !this.autoplayButtonIsSetToPlay;
  }

  play() {
    this.slider.setAttribute('aria-live', 'off');
    clearTimeout(this.autoplay);
    this.autoplay = setTimeout(this.autoRotateSlides.bind(this), this.autoplaySpeed);
  }

  pause() {
    this.slider.setAttribute('aria-live', 'polite');
    clearTimeout(this.autoplay);
  }

  togglePlayButtonState() {
    if(!this.sliderAutoplayButton) return;
    if (!this.autoplayButtonIsSetToPlay) {
      this.sliderAutoplayButton.classList.add(this.autoPlayPausedClass);
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.playSlideshow);
    } else {
      this.sliderAutoplayButton.classList.remove(this.autoPlayPausedClass);
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.pauseSlideshow);
    }
  }

  autoRotateSlides() {
    const slideScrollPosition = this.currentPage === this.sliderItems.length ? 0 : this.slider.scrollLeft + this.sliderItemOffset;
    this.slider.scrollTo({
      left: slideScrollPosition
    });
  }

  onButtonClick(event) {
    event.preventDefault();
    const step = event.currentTarget.dataset.step || 1;
    this.slideScrollPosition = event.currentTarget.name === 'next' ? this.slider.scrollLeft + (step * this.sliderItemOffset) : this.slider.scrollLeft - (step * this.sliderItemOffset);
    this.slider.scrollTo({
      left: this.slideScrollPosition
    });
  }
}

customElements.define('slider-component', SliderComponent);

class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange);
    this.sectionId = this.dataset.originalSection || this.dataset.section;
  }

  onVariantChange(event) {
    const target = this.getInputForEventTarget(event.target);
    this.publishChangeEvent(target);
  }

  getInputForEventTarget(target) {
    return target.tagName === 'SELECT' ? target.selectedOptions[0] : target;
  }

  get selectedOptionValues() {
    const valueIds = [];
    this.querySelectorAll('select').forEach((select) => {
      valueIds.push(select.options[select.selectedIndex].dataset.optionValueId);
    });
    return valueIds;
  }

  publishChangeEvent(target, recall = false, customSelectedOptionValues = null) {
    const params = {
      sectionId: this.dataset.section,
      target: target,
      selectedOptionValues: (customSelectedOptionValues) ? customSelectedOptionValues : this.selectedOptionValues,
    };
    if(recall) {
      params.recallId = this.dataset.section;
    }
    document.dispatchEvent(new CustomEvent('optionValueSelectionChange', {detail: params}));
  }

  autoCorrectAvailableVariant(newProductInfoNode) {
    const newSelectedOptionValues = [];
    var findSelectedOptionValue;
    newProductInfoNode.querySelectorAll('.product-form__input--variant-picker').forEach(fieldset => {
      if(!fieldset.classList.contains('last')) {
        const currentSelectedOptionValue = fieldset.querySelector('li:not(.hidden) input[type="radio"]:checked, option:not(.hidden)[selected]');
        newSelectedOptionValues.push(currentSelectedOptionValue.dataset.optionValueId);
      } else {
        findSelectedOptionValue = fieldset.querySelector('li:not(.hidden) input[type="radio"]:not(:checked), option:not(.hidden):not([selected])');
        newSelectedOptionValues.push(findSelectedOptionValue.dataset.optionValueId);
      }
    });
    this.publishChangeEvent(document.getElementById(findSelectedOptionValue.id), true, newSelectedOptionValues);
  }
}

customElements.define('variant-selects', VariantSelects);

class VariantRadios extends VariantSelects {
  constructor() {
    super();
  }

  connectedCallback() {
    this.loadBackgroundColorSwatches();
  }

  get selectedOptionValues() {
    return Array.from(this.querySelectorAll('input[type="radio"]:checked')).map(
      ({ dataset }) => dataset.optionValueId
    );
  }

  loadBackgroundColorSwatches() {
    if(!window.loadedBackgroundColorSwatches && this.querySelectorAll('.product-form__input__radio-label--color').length > 0) {
      loadColorSwatches();
    }
  }
}

customElements.define('variant-radios', VariantRadios);

const deferredMediaObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if(entry.isIntersecting) {
      entry.target.loadContent(false);
    } else {
      entry.target.pause();
    }
  });
});

class DeferredMedia extends HTMLElement {
  constructor() {
    super();
    this.isPlaying = false;
    const poster = this.querySelector('[id^="Deferred-Poster-"]');
    if (!poster) return;
    poster.addEventListener('click', this.loadContent.bind(this));

    if(this.dataset.autoplay) {
      deferredMediaObserver.observe(this);
    }
  }

  loadContent(focus = true, play = false) {
    if (!this.deferredElement) {
      if(!this.hasAttribute('loaded')) {
        const content = document.createElement('div');
        content.appendChild(this.querySelector('template').content.firstElementChild.cloneNode(true));

        this.setAttribute('loaded', true);
        this.deferredElement = this.appendChild(content.querySelector('video, model-viewer, iframe'));
      } else {
        this.deferredElement = this.querySelector('video, model-viewer, iframe');
      }
    }
    if(this.deferredElement) {
      if (focus) this.deferredElement.focus();
      if (this.deferredElement.getAttribute('autoplay') || this.dataset.autoplay || play) {
        // force autoplay for safari
        this.play();
      }
    }
  }

  play() {
    if(this.isPlaying) return;
    if(this.deferredElement.nodeName == 'VIDEO') {
      this.deferredElement.play();
    } else if(this.deferredElement.classList.contains('js-youtube')) {
      this.deferredElement.contentWindow.postMessage('{"event":"command","func":"' + 'playVideo' + '","args":""}', '*');
    } else if(this.deferredElement.classList.contains('js-vimeo')) {
      this.deferredElement.contentWindow.postMessage('{"method":"play"}', '*');
    }
    this.isPlaying = true;
  }

  pause() {
    if(this.deferredElement && this.isPlaying) {
      window.pauseAllMedia(this);
      this.isPlaying = false;
    }
  }
}

customElements.define('deferred-media', DeferredMedia);

class BtStorageUtil {
  static set(key, value, isSession) {
    if (isSession) {
      sessionStorage.setItem(
        `bt-${key}`,
        typeof value === 'object' ? JSON.stringify(value) : value
      );
    } else {
      localStorage.setItem(`bt-${key}`, typeof value === 'object' ? JSON.stringify(value) : value);
    }
  }

  static get(key, isJson, isSession) {
    const value = isSession ? sessionStorage.getItem(`bt-${key}`) : localStorage.getItem(`bt-${key}`);
    if (isJson) {
      return JSON.parse(value);
    }
    return value;
  }

  static remove(key, isSession) {
    if (isSession) {
      sessionStorage.removeItem(`bt-${key}`);
    } else {
      localStorage.removeItem(`bt-${key}`);
    }
  }
}