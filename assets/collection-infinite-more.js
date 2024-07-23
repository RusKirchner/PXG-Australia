class CollectionLoadingButton extends HTMLElement
{
	constructor() {
		super();
	}

	fetchData(cb = null) {
		const productGrid = document.getElementById(this.dataset.productGrid);
		productGrid.parentElement.classList.add('loading');
		fetch(`${this.dataset.url}`, {method: 'GET'})
		.then((response) => {
			return response.text();
		})
		.then(responseText => {
			productGrid.parentElement.classList.remove('loading');
			const responseHTML = new DOMParser().parseFromString(responseText, 'text/html');
			const responseProductItems = responseHTML.querySelectorAll(`#${this.dataset.productGrid} .grid__item`);
			
			if(responseProductItems.length > 0) {
				responseProductItems.forEach(element => {
					productGrid.appendChild(element);
				});
			}
			
			const newButton = responseHTML.querySelector('.collection__loading-button');
			if(newButton) {
				this.parentElement.appendChild(newButton);
			}

			this.remove();

			if(cb) {
				cb();
			}
		})
		.catch(e => {
			productGrid.parentElement.classList.remove('loading');
		});
	}
}

class CollectionInfiniteButton extends CollectionLoadingButton
{
  connectedCallback() {
		let observer = new IntersectionObserver((entries, observer) => {
			if(entries[0].isIntersecting) {
				this.fetchData();
				observer.disconnect();
			}
		});

		observer.observe(this);
	}
}

customElements.define('collection-infinite-button', CollectionInfiniteButton);

class CollectionLoadMoreButton extends CollectionLoadingButton
{
	connectedCallback() {
		this.addEventListener('click', this.onClick);
	}

	onClick() {
		this.removeEventListener('click', this.onClick);
		this.fetchData();
	}

	disconnectedCallback() {
		this.removeEventListener('click', this.onClick);
	}
}

customElements.define('collection-load-more-button', CollectionLoadMoreButton);