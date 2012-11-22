function hhWidget(elementName, options) {
	var hh = this;
	var m = 0;
	var tm = 0;
	this._element = null;
	this._basicUrl = 'http://api.hh.ru/1/json/';
	this._basicTemplate = '<!-- caption --> <div class="hhWidgetVacanciesList"><!-- vacanciesList --></div><div class="hhWidgetSearch"><form><!-- inputSearch --> <!-- fieldSelect --> <!-- employmentSelect --> <!-- inputSalary --> <!-- searchButton --></form></div>';
	this._iframe = null;
	this.options = {
		caption: 'Вакансии',
		animate: true,
		search: true,
		limit: 5,
	};
	
	this.init = function(elementName, options) {
		if (options) {
			for (var o in options) {
				this.options[o] = options[o];
			}
		}
		this._element = document.getElementById(elementName);
		this._element.className += ' hhWidget';
		this._element.innerHTML = this._basicTemplate;

		if (this.options.caption != '') {
			this.prepare('caption', '<span class="hhWidgetHeader">' + this.options.caption + '</span>');
		}
		
		this._iframe = document.createElement('iframe');
		this._iframe.setAttribute('style', 'width:0px;height:0px;border:0;');
		var body = document.getElementsByTagName('body').item(0);
		body.appendChild(this._iframe);

		if (this.options.search) {
			this._attachScript('employment', '_parseEmployment');
			this._attachScript('field/all', '_parseField');
		}

		this._attachScript('vacancy/search', '_parseVacancies', {'items': this.options.limit, 'period': 1, 'sort': 2});
		
		this.prepareForm();
	};


	function _(elementType, options) {
		var item = document.createElement(elementType);
		if (options) {
			for (var o in options) {
				item.setAttribute(o, options[o]);
			}
		}
		
		return item;
	}
	
	function isEmpty(obj) {
		for(var prop in obj) {
			if(obj.hasOwnProperty(prop))
				return false;
		}

		return true;
	}

	
	this._attachScript = function(url, callback, _params) {
		var params = ['callback=hhWidget.' + callback];
		for (var p in _params) {
			params.push(p + '=' + _params[p]);
		}		
		var script = _('script', {type: 'text/javascript', charset: 'utf-8', src: this._basicUrl + url + '/?' + params.join('&')});
		this._iframe.appendChild(script);
	};

	
	this.prepare = function(template, data, _el) {
		var replaceElement = _el || this._element;
		replaceElement.innerHTML = replaceElement.innerHTML.replace(new RegExp('<!-- ' + template + ' -->', 'g'), data);
	}
	
	
	this.prepareForm = function() {
		if (!this.options.search) {
			this._element.className += ' noSearch';
			this._element.innerHTML = this._element.innerHTML.replace(/<!-- startSearch -->.*<!-- endSearch -->/g, '');
		} else {
			var form = this._element.getElementsByTagName('form').item(0);
			if (form.addEventListener) {
				form.addEventListener('submit', function (e) { e.preventDefault(); hh.search.call(hh) });
			} else if (form.attachEvent) {
				form.attachEvent('onsubmit', function (e) { e.returnValue = false; hh.search.call(hh) } );
			}
		
			var container = document.createElement('div');
			var item = _('input', {type: 'text', name: 'text', 'class': 'hhWidgetText', placeholder: 'Вакансия'});
			container.appendChild(item);
			this.prepare('inputSearch', container.innerHTML, form);

			container.innerHTML = '';
			var item = _('input', {type: 'text', name: 'salary', 'class': 'hhWidgetSalary', placeholder: 'Зарплата'});
			container.appendChild(item);
			var item = _('span');
			item.innerHTML = '&nbsp;руб.';
			container.appendChild(item);
			this.prepare('inputSalary', container.innerHTML, form);
			
			container.innerHTML = '';
			var item = _('input', {type: 'submit', name: 'submit', 'class': 'hhWidgetButton', value: 'Найти'});
			container.appendChild(item);
			this.prepare('searchButton', container.innerHTML, form);
		}
	};
	
	
	this.search = function() {
		var form = this._element.getElementsByTagName('form').item(0);

		var searchText = form.text.value;
		var searchSalary = form.salary.value;
		var searchOnlySalary = searchSalary != '';
		var select = form.field;
		var option = select.options[select.selectedIndex];
		var searchField = option.value;
		var select = form.employment;
		var option = select.options[select.selectedIndex];
		var searchEmployment = option.value;
		
		form.text.setAttribute('disabled', 'disabled');
		form.salary.setAttribute('disabled', 'disabled');
		form.field.setAttribute('disabled', 'disabled');
		form.employment.setAttribute('disabled', 'disabled');
		form.submit.setAttribute('disabled', 'disabled');
		form.submit.setAttribute('value', 'Идёт поиск…');
		
		this._attachScript('vacancy/search', '_parseSearch', {'field': searchField, 'salary': searchSalary, 'onlysalary': searchOnlySalary, 'employment': searchEmployment, 'text': searchText, 'currency': 'RUR', 'items': this.options.limit, 'sort': 2});
	};
	

	this._parseSearch = function(response) {
		var form = this._element.getElementsByTagName('form').item(0);
		form.text.removeAttribute('disabled');
		form.salary.removeAttribute('disabled');
		form.field.removeAttribute('disabled');
		form.employment.removeAttribute('disabled');
		form.submit.removeAttribute('disabled');
		form.submit.setAttribute('value', 'Найти');
		clearInterval(m);
		clearInterval(tm);

		var els = this._element.getElementsByTagName('div');
		for (var i = 0; i < els.length; i++) {
			if (els[i].className == 'hhWidgetVacanciesList') {
				els[i].innerHTML = els[i].innerHTML.replace(/<!-- startVacancy -->.*<!-- endVacancy -->/, '<!-- vacanciesList -->');
			}
		}

		this._parseVacancies(response);
	};

	
	this._parseEmployment = function(response) {
		var container = _('div');
		var item = _('select', {'class': 'hhWidgetSelect', name: 'employment'});
		for (var i = 0; i < response.length; i++) {
			var option = _('option');
			option.value = response[i].id;
			option.text = response[i].name;
			item.appendChild(option);
		}
		container.appendChild(item);
		
		this.prepare('fieldSelect', container.innerHTML);
		this.prepareForm();
	};

	
	this._parseField = function(response) {
		var container = _('div');
		var item = _('select', {'class': 'hhWidgetSelect', name: 'field'});
		for (var i = 0; i < response.length; i++) {
			var option = _('option');
			option.value = response[i].id;
			option.text = response[i].name;
			item.appendChild(option);
		}
		container.appendChild(item);
		
		this.prepare('employmentSelect', container.innerHTML);
		this.prepareForm();
	};

	
	this._parseVacancies = function(response) {
		var found = response.found;
		var response = response.vacancies;
		var vacancyTemplate = '<li><p><!-- vacancyName --></p> <p><!-- vacancySalary --></p> <p class="hhWidgetAddress"><!-- vacancyAddress --></p></li>';
		
		var html = '';
		var item = _('div');

		var container = _('div');
		if (response) {
			for (var i = 0; i < response.length; i++) {
				item.innerHTML = vacancyTemplate;
				container.innerHTML = '';

				var link = _('a', {href: response[i].links.alternate.href});
				link.innerHTML = response[i].name;

				container.appendChild(link);
				this.prepare('vacancyName', container.innerHTML, item);
				container.innerHTML = '';
				
				var salary = _('span');
				if (response[i].salary) {
					var currency = ' руб.';
					if (response[i].salary.currency) {
						currency = ' ' + response[i].salary.currency.name;
					}
					if (response[i].salary.from) {
						salary.innerHTML = 'От ' + response[i].salary.from + currency;
					}
					if (response[i].salary.to) {
						salary.innerHTML += ' до ' + response[i].salary.to + currency;
					}
				} else {
					salary.innerHTML = 'Размер заработной платы не указан';
				}
				
				container.appendChild(salary);
				this.prepare('vacancySalary', container.innerHTML, item);
				container.innerHTML = '';
				
				var address = _('span');
				address.innerHTML = response[i].region.name;
				if (response[i].address) {
					var adr = [];
					if (response[i].address.city && !isEmpty(response[i].address.city)) {
						adr.push(response[i].address.city);
					}
					if (response[i].address.street && !isEmpty(response[i].address.street)) {
						adr.push(response[i].address.street);
					}
					if (response[i].address.building && !isEmpty(response[i].address.building)) {
						adr.push(response[i].address.building);
					}
					if (adr.length > 0) {
						address.innerHTML = adr.join(', ');
					}
				}
				
				container.appendChild(address);
				this.prepare('vacancyAddress', container.innerHTML, item);

				html += item.innerHTML;
			}
		}

		var vacanciesElementId = 'hh-scroll' + (new Date().getTime());
		
		var els = this._element.getElementsByTagName('div');
		for (var i = 0; i < els.length; i++) {
			if (els[i].className == 'hhWidgetVacanciesList') {
				this.prepare('vacanciesList', '<!-- startVacancy --><div class="vacancyScroll" id="' + vacanciesElementId + '"><ul>' + html + '</ul></div><!-- vacanciesFound --><!-- endVacancy -->', els[i]);
				var container = _('div');
				var item = _('span', {'class': 'hhWidgetFound'});
				item.innerHTML = found > 0 ? 'Показано ' + response.length + ' из ' + found : 'Ничего не найдено';
				container.appendChild(item);
				this.prepare('vacanciesFound', container.innerHTML, els[i]);
			}
		}

		if (response && response.length > 0 && this.options.animate) {
			var carouselItem = document.getElementById(vacanciesElementId);
			var ul = carouselItem.getElementsByTagName('ul').item(0);
			var limit = 200;

			m = setInterval(
				function() {
					var marginLeft = 0;
					ul.setAttribute('style', 'margin-left: 0px');
					clearInterval(tm);
					
					tm = setInterval(
						function() {
							marginLeft -= 10;
							ul.setAttribute('style', 'margin-left: ' + marginLeft + 'px');
							if (marginLeft < -limit) {
								marginLeft = 0;
								ul.setAttribute('style', 'margin-left: 0px');
								clearInterval(tm);
								var first = ul.getElementsByTagName('li').item(0);
								ul.appendChild(first);
							}
						},
						50
					);
				},
				this.options.limit * 700
			);
		}
	};

	
	if (window.addEventListener) {
		window.addEventListener('load', function () { hh.init(elementName, options) }, false);
	} else if (window.attachEvent) {
		window.attachEvent('onload', function () { hh.init(elementName, options) } );
	}
	
}