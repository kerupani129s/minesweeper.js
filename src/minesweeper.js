(() => {

	const Cell = class {

		constructor(background, row, column, width, height, textStyle) {

			this._cellWidth = width;
			this._cellHeight = height;

			this._open = false;

			// 
			this._text = new PIXI.Text('', textStyle);

			this._text.anchor.set(0.5);

			this._text.position.set(this._cellWidth * (column + 0.5), this._cellHeight * (row + 0.5));

			background.addChild(this._text);

			// 
			this._cell = new PIXI.Graphics();

			this._cell.beginFill(0xe0e0e0);
			this._cell.drawRect(- this._cellWidth * 0.45, - this._cellHeight * 0.45, this._cellWidth * 0.9, this._cellHeight * 0.9);
			this._cell.endFill();

			this._cell.position.set(this._cellWidth * (column + 0.5), this._cellHeight * (row + 0.5));

			background.addChild(this._cell);

		}

		set open(_open) {
			this._open = _open;
			this._cell.visible = ! _open;
		}

		get open() {
			return this._open;
		}

		set count(_count) {
			this._count = _count;
			this._text.text = _count ? '' + _count : '';
		}

		get count() {
			return this._count;
		}

		set mine(_mine) {
			this._mine = _mine;
			this._text.text = _mine ? '●' : '';
		}

		get mine() {
			return this._mine;
		}

	};

	window.Minesweeper = class {

		constructor(element) {

			this._width = 1600;
			this._height = 1600;

			// 
			this._app = new PIXI.Application({width: this._width, height: this._height});

			element.appendChild(this._app.view);

		}

		stage(data) {

			this._row = data.row;
			this._column = data.column;
			this._mine = data.mine;

			// 
			const background = new PIXI.Graphics();

			background.beginFill(0xffffff);
			background.drawRect(0, 0, this._width, this._height);
			background.endFill();

			background.interactive = true;

			background.on('pointertap', event => this._pointerTapped(event));

			this._app.stage.addChild(background);

			// 
			const textStyle = new PIXI.TextStyle({fontFamily: 'Arial', fontSize: this._cellHeight, fill: 0xe0e0e0});

			this._field = [];

			for (let row = 0; row < this._row; row++) {
				this._field[row] = [];
				for (let column = 0; column < this._column; column++) {
					this._field[row][column] = new Cell(background, row, column, this._cellWidth, this._cellHeight, textStyle);
				}
			}

		}

		open(row, column) {

			const cell = this._field[row][column];

			if ( cell.open ) return;
			cell.open = true;

			// 
			if ( cell.count === 0 ) {
				this._getNeighbours(row, column).forEach(([newRow, newColumn]) => {
					this.open(newRow, newColumn);
				});
			}

		}

		get _cellWidth() {
			return this._width / this._column;
		}

		get _cellHeight() {
			return this._height / this._row;
		}

		_getNeighbours(row, column) {

			const offsets = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

			return offsets
				.map(([r, c]) => [row + r, column + c])
				.filter(([newRow, newColumn]) => 0 <= newRow && newRow < this._row && 0 <= newColumn && newColumn < this._column);

		}

		_pointerTapped(event) {

			const position = event.data.getLocalPosition(event.currentTarget);
			const [row, column] = [Math.floor(position.y / this._cellHeight), Math.floor(position.x / this._cellWidth)];

			// 作る
			if ( ! this._started ) {
				this._create(row, column);
				this._started = true;
			}

			// 開く
			this.open(row, column);

		}

		_create(row, column) {

			const getCellOf = index => {

				const column = index % this._column;
				const row = (index - column) / this._column;

				return [row, column];

			};

			const indices = [...Array(this._row * this._column).keys()];

			// 爆弾をばらまく
			indices.splice(row * this._column + column, 1);

			for (let i = 0; i < this._mine; i++) {

				// Note: row, column を別々に乱数にすると確率が偏る
				const index = indices.splice(Math.floor(Math.random() * indices.length), 1)[0];
				const [row, column] = getCellOf(index);

				this._field[row][column].mine = true;

			}

			// 爆弾数表示
			indices.push(row * this._column + column);

			indices.forEach(index => {

				const [row, column] = getCellOf(index);

				const count = this._getNeighbours(row, column)
					.filter(([newRow, newColumn]) => this._field[newRow][newColumn].mine).length;

				this._field[row][column].count = count;

			});

		}

	};

})();
