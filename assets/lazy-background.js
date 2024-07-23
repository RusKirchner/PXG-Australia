if (!customElements.get('lazy-background')) {
	if(typeof window.lazyBackgroundObserver == 'undefined') {
		window.lazyBackgroundObserver = new IntersectionObserver((entries, observer) => {
			entries.forEach(entry => {
				if(entry.isIntersecting) {
					entry.target.showBackground();
					observer.unobserve(entry.target);
				}
			});
		}, {rootMargin: `-50px 0px -50px 0px`});
	}
	
	customElements.define('lazy-background', class LazyBackground extends HTMLElement {
		constructor() {
			super();
		}

		connectedCallback() {
			this.createObserver();
		}
	
		createObserver() {
			window.lazyBackgroundObserver.observe(this);
		}

		showBackground() {
			this.style.backgroundImage = `url(${this.dataset.backgroundImage})`;
			this.classList.add('loaded');
		}
	});
}