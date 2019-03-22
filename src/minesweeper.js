(() => {

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
			this._field = [];

			const textStyle = new PIXI.TextStyle({fontFamily: 'Arial', fontSize: this._cellHeight, fill: 0xe0e0e0});

			for (let row = 0; row < this._row; row++) {

				this._field[row] = [];

				for (let column = 0; column < this._column; column++) {

					this._field[row][column] = {};

					// 
					const text = new PIXI.Text('', textStyle);

					text.anchor.set(0.5);

					text.position.set(this._cellWidth * (column + 0.5), this._cellHeight * (row + 0.5));

					this._field[row][column].text = text;

					this._app.stage.addChild(text);

					// 
					const cell = new PIXI.Graphics();

					cell.beginFill(0xe0e0e0);
					cell.drawRect(- this._cellWidth * 0.45, - this._cellHeight * 0.45, this._cellWidth * 0.9, this._cellHeight * 0.9);
					cell.endFill();

					cell.position.set(this._cellWidth * (column + 0.5), this._cellHeight * (row + 0.5));

					this._field[row][column].cell = cell;

					background.addChild(cell);


				}

			}

		}

		open(row, column) {

			if ( ! this._field[row][column].cell.visible ) return;

			this._field[row][column].cell.visible = false;

			// 
			if ( this._field[row][column].count === 0 ) {
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

				this._field[row][column].text.text = '●';
				this._field[row][column].mine = true;

			}

			// 爆弾数表示
			indices.push(row * this._column + column);

			indices.forEach(index => {

				const [row, column] = getCellOf(index);

				const count = this._getNeighbours(row, column)
					.filter(([newRow, newColumn]) => this._field[newRow][newColumn].mine).length;

				this._field[row][column].text.text = count ? '' + count : '';
				this._field[row][column].count = count;

			});

		}

	};

})();
