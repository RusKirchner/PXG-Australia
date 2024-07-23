class ShippingCaculator extends HTMLElement {
	constructor() {
		super();

    this.needEndLoading = false;
    this.showingErrors = false;
		this.button = this.querySelector('button');
		this.addressCountrySelect = this.querySelector('#AddressCountryCalculator');
		this.addressProvinceSelect = this.querySelector('#AddressProvinceCalculator');
		this.addressZipInput = this.querySelector('#AddressZipCalculator');
    this.resultsTag = this.querySelector('.shipping-calculator__results');
    this.resultsList = this.querySelector('.shipping-calculator__results-list');
    this.resultsErrorHeading = this.querySelector('.shipping-calculator__error-heading');
    this.resultsSuccessHeading = this.querySelector('.shipping-calculator__success-heading');

    this.button.addEventListener('click', this.onButtonClick.bind(this));
    this.addEventListener('change', this.hideErrorsTag.bind(this), false);
	}

  connectedCallback() {
    this.setupCountries();
  }

	setupCountries() {
    if (Shopify && Shopify.CountryProvinceSelector) {
      // eslint-disable-next-line no-new
      new Shopify.CountryProvinceSelector(this.addressCountrySelect.id, this.addressProvinceSelect.id, {
        hideElement: 'AddressProvinceContainerCalculator'
      });
    }
  }

  serialize(obj, prefix) {
	  var str = [], p;
	  for (p in obj) {
	    if (obj.hasOwnProperty(p)) {
	      var k = prefix ? prefix + "[" + p + "]" : p,
	        v = obj[p];
	      str.push((v !== null && typeof v === "object") ?
	        this.serialize(v, k) :
	        encodeURIComponent(k) + "=" + encodeURIComponent(v));
	    }
	  }
	  return str.join("&");
	}

  startLoading() {
    this.needEndLoading = false;
    this.button.setAttribute('aria-disabled', true);
    this.button.classList.add('loading');
    this.querySelector('.loading-overlay__spinner').classList.remove('hidden');
  }

  endLoading() {
    if(this.needEndLoading) {
      // Run end loading action
      this.needEndLoading = false;
      this.button.setAttribute('aria-disabled', false);
      this.button.classList.remove('loading');
      this.querySelector('.loading-overlay__spinner').classList.add('hidden');
    }
  }

  appendResultNode(text) {
    const li = document.createElement("li");
    const node = document.createTextNode(text);
    li.appendChild(node);
    this.resultsList.appendChild(li);
  }

  handleResultsList(list) {
    this.resultsList.innerHTML = '';
    for(var key in list) {
      if(Array.isArray(list[key])) {
        list[key].forEach((item) => {
          if(typeof item === 'object') {
            const li = document.createElement("li");
            const spanPrice = document.createElement("span");
            spanPrice.classList.add('price');
            const span = document.createElement("span");
            span.classList.add('cart-item__price', 'heading-font');
            const text = item.presentment_name + ': ';
            span.innerHTML = Shopify.showPrice(item.price * 100);
            spanPrice.append(span);
            const node = document.createTextNode(text);
            li.appendChild(node);
            li.appendChild(spanPrice);
            this.resultsList.appendChild(li);
          } else {
            this.appendResultNode(item);
          }
        });
      } else {
        this.appendResultNode(list[key]);
      }
    }
    this.resultsTag.classList.remove('hidden');
  }

  handleErrorResponse(errors) {
    this.showingErrors = true;
    this.resultsErrorHeading.classList.remove('hidden');
    this.resultsSuccessHeading.classList.add('hidden');
    this.handleResultsList(errors);
  }

  handleSuccessResponse(list) {
    this.showingErrors = false;
    this.resultsSuccessHeading.classList.remove('hidden');
    this.resultsErrorHeading.classList.add('hidden');
    this.handleResultsList(list);
  }

  hideErrorsTag() {
    if(this.showingErrors) {
      this.resultsTag.classList.add('hidden');
      this.showingErrors = false;
    }
  }

  onButtonClick(event) {
  	if (this.button.classList.contains('loading')) return;

    this.startLoading();
  	
    const params = {
    	shipping_address: {
    		country: this.addressCountrySelect.value,
	    	province: this.addressProvinceSelect.value,
	    	zip: this.addressZipInput.value
    	}
    };

    const body = JSON.stringify(params);
    fetch(`${routes.cart_url}/prepare_shipping_rates.json`, {...fetchConfig('json', 'POST'), ...{ body }})
    .then((response) => response.json())
    .then((response) => {
      if(response == null || response.ok) {
        fetch(`${routes.cart_url}/async_shipping_rates.json?` + this.serialize(params), {...fetchConfig('json', 'GET'), ...{}})
        .then((finalResponse) => finalResponse.json())
        .then((finalResponse) => {
          this.handleSuccessResponse(finalResponse);
        })
        .finally(() => {
          this.needEndLoading = true;
          this.endLoading();
        });
      } else {
        this.needEndLoading = true;
        this.handleErrorResponse(response);
      }
    })
    .catch((e) => {
      this.handleErrorResponse(e);
      this.needEndLoading = true;
    })
    .finally(() => {
      this.endLoading();
    });
  }
}

customElements.define('shipping-calculator', ShippingCaculator);