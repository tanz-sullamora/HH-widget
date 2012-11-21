function hhWidget(elementName, options) {
	var hh = this;
	var m = 0;
	var tm = 0;
	this._element = null;
	this._basicUrl = 'http://api.hh.ru/1/json/';
	this._basicTemplate = '<!-- caption --> <!-- vacanciesList --> <div class="hhWidgetSearch"><form><!-- inputSearch --> <!-- fieldSelect --> <!-- employmentSelect --> <!-- inputSalary --> <!-- searchButton --></form></div>';
	this._iframe = null;
	this.options = {
		caption: 'Вакансии HeadHunter',
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

	
	this._attachScript = function(url, callback, _params) {
		var params = ['callback=hhWidget.' + callback];
		for (var p in _params) {
			params.push(p + '=' + _params[p]);
		}		
		var script = document.createElement('script');
		script.setAttribute('type', 'text/javascript');
		script.setAttribute('charset', 'utf-8');
		script.setAttribute('src', this._basicUrl + url + '/?' + params.join('&'));
		this._iframe.appendChild(script);
	};

	
	this.prepare = function(template, data, _el) {
		var replaceElement = _el || this._element;
		replaceElement.innerHTML = replaceElement.innerHTML.replace(new RegExp('<!-- ' + template + ' -->', 'g'), data);
		
		var form = this._element.getElementsByTagName('form').item(0);
		if (form.addEventListener) {
			form.addEventListener('submit', function (e) { e.preventDefault(); hh.search.call(hh) });
		} else if (form.attachEvent) {
			form.attachEvent('onsubmit', function (e) { e.returnValue = false; hh.search.call(hh) } );
		}
	}
	
	
	this.prepareForm = function() {
		if (!this.options.search) {
			this._element.className += ' noSearch';
			this._element.innerHTML = this._element.innerHTML.replace(/<!-- startSearch -->.*<!-- endSearch -->/g, '');
		} else {
			var container = document.createElement('div');
			var item = document.createElement('input');
			item.setAttribute('type', 'text');
			item.setAttribute('name', 'text');
			item.setAttribute('class', 'hhWidgetText');
			item.setAttribute('placeholder', 'Вакансия');
			container.appendChild(item);
			this.prepare('inputSearch', container.innerHTML);

			container.innerHTML = '';
			var item = document.createElement('input');
			item.setAttribute('type', 'text');
			item.setAttribute('name', 'salary');
			item.setAttribute('class', 'hhWidgetSalary');
			item.setAttribute('placeholder', 'Зарплата');
			container.appendChild(item);
			var item = document.createElement('span');
			item.innerHTML = '&nbsp;руб.';
			container.appendChild(item);
			this.prepare('inputSalary', container.innerHTML);
			
			container.innerHTML = '';
			var item = document.createElement('input');
			item.setAttribute('type', 'submit');
			item.setAttribute('name', 'submit');
			item.setAttribute('class', 'hhWidgetButton');
			item.setAttribute('value', 'Найти');
			container.appendChild(item);
			this.prepare('searchButton', container.innerHTML);
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
		
		this._attachScript('vacancy/search', '_parseSearch', {'field': searchField, 'salary': searchSalary, 'onlysalary': searchOnlySalary, 'employment': searchEmployment, 'text': searchText, 'currency': 'RUR', 'items': 10, 'sort': 2});
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

		this._element.innerHTML = this._element.innerHTML.replace(/<!-- startVacancy -->.*<!-- endVacancy -->/, '<!-- vacanciesList -->');

		this._parseVacancies(response);
	};

	
	this._parseEmployment = function(response) {
		var container = document.createElement('div');
		var item = document.createElement('select');
		item.setAttribute('class', 'hhWidgetSelect');
		item.setAttribute('name', 'employment');
		var options = '';
		for (var i = 0; i < response.length; i++) {
			options += '<option value="' + response[i].id + '">' + response[i].name + '</option>';
		}
		item.innerHTML = options;
		container.appendChild(item);
		
		this.prepare('fieldSelect', container.innerHTML);
	};

	
	this._parseField = function(response) {
		var container = document.createElement('div');
		var item = document.createElement('select');
		item.setAttribute('class', 'hhWidgetSelect');
		item.setAttribute('name', 'field');
		var options = '';
		for (var i = 0; i < response.length; i++) {
			options += '<option value="' + response[i].id + '">' + response[i].name + '</option>';
		}
		item.innerHTML = options;
		container.appendChild(item);
		
		this.prepare('employmentSelect', container.innerHTML);
	};

	
	this._parseVacancies = function(response) {
		response = response.vacancies;
		var vacancyTemplate = '<li><p><!-- vacancyName --></p> <p><!-- vacancySalary --></p> <p class="hhWidgetAddress"><!-- vacancyAddress --></p></li>';
		
		var html = '';
		var item = document.createElement('div');

		var container = document.createElement('div');
		for (var i = 0; i < response.length; i++) {
			item.innerHTML = vacancyTemplate;
			container.innerHTML = '';

			var link = document.createElement('a');
			link.setAttribute('href', response[i].links.alternate.href);
			link.innerHTML = response[i].name;

			container.appendChild(link);
			this.prepare('vacancyName', container.innerHTML, item);
			container.innerHTML = '';
			
			var salary = document.createElement('span');
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
			
			var address = document.createElement('span');
			if (response[i].address) {
				var adr = [response[i].address.city, response[i].address.street, response[i].address.building];
				address.innerHTML = adr.join(', ');
			} else {
				address.innerHTML = response[i].region.name;
			}
			
			container.appendChild(address);
			this.prepare('vacancyAddress', container.innerHTML, item);

			html += item.innerHTML;
		}

		var vacanciesElementId = 'hh-scroll' + (new Date().getTime());
		this.prepare('vacanciesList', '<!-- startVacancy --><div class="vacancyScroll" id="' + vacanciesElementId + '"><ul>' + html + '</ul></div><!-- endVacancy -->');

		if (response.length > 0 && this.options.animate) {
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