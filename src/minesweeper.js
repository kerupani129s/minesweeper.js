(() => {

	const Field = class {

		constructor(row, column, mine) {

			this._row = row;
			this._column = column;
			this._mine = mine;

			this._clearedCount = this._row * this._column - this._mine;

			// 
			this._neighbourOffsets = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

		}

		_getCellOf(index) {

			const column = index % this._column;
			const row = (index - column) / this._column;

			return [row, column];

		}

		_getNeighbours(row, column) {

			return this._neighbourOffsets
				.map(([r, c]) => [row + r, column + c])
				.filter(([newRow, newColumn]) => 0 <= newRow && newRow < this._row && 0 <= newColumn && newColumn < this._column);

		}

		create(startRow, startColumn, callback = () => {}) {

			this._state = [];
			for (let row = 0; row < this._row; row++) {
				this._state[row] = [];
				for (let column = 0; column < this._column; column++) {
					this._state[row][column] = {};
				}
			}

			this._revealedCount = 0;

			// 
			const indices = [...Array(this._row * this._column).keys()];

			// 爆弾をばらまく
			indices.splice(startRow * this._column + startColumn, 1);

			for (let i = 0; i < this._mine; i++) {

				// Note: row, column を別々に乱数にすると確率が偏る
				const index = indices.splice(Math.floor(Math.random() * indices.length), 1)[0];
				const [row, column] = this._getCellOf(index);

				this._state[row][column].mine = true;

			}

			// 爆弾数計算
			indices.push(startRow * this._column + startColumn);

			indices.forEach(index => {

				const [row, column] = this._getCellOf(index);

				const count = this._getNeighbours(row, column)
					.filter(([newRow, newColumn]) => this._state[newRow][newColumn].mine).length;

				this._state[row][column].count = count;

			});

			// 
			for (let row = 0; row < this._row; row++) {
				for (let column = 0; column < this._column; column++) {
					callback(row, column);
				}
			}

		}

		reveal(row, column, callback = () => {}) {

			const cell = this._state[row][column];

			if ( cell.revealed ) return;
			cell.revealed = true;
			this._revealedCount++;

			callback(row, column);

			// 
			// Note: 爆弾の時は false
			if ( cell.count === 0 ) {
				this._getNeighbours(row, column).forEach(([newRow, newColumn]) => {
					this.reveal(newRow, newColumn, callback);
				});
			}

		}

		revealed(row, column) {
			return this._state[row][column].revealed;
		}

		isMine(row, column) {
			return this._state[row][column].mine;
		}

		count(row, column) {
			return this._state[row][column].count;
		}

		get created() {
			return Boolean(this._state);
		}

		get cleared() {
			// Note: ゲームオーバーになっていない前提
			// Note: this._state を探索して個数を調べたり条件に合うか調べたりしても良いけれど、こちらの方が処理が速くメモリ消費も少ない
			return this._revealedCount === this._clearedCount;
		}

	};

	window.Minesweeper = class {

		constructor(element) {

			this._width = 1600;
			this._height = 1600;

			this._displayObjects = {};

			// 
			this._app = new PIXI.Application({width: this._width, height: this._height});

			element.appendChild(this._app.view);

			// 
			this._createDisplayObjects();

		}

		_createDisplayObjects() {

			// 背景
			const background = new PIXI.Graphics();

			background.beginFill(0xffffff);
			background.drawRect(0, 0, this._width, this._height);
			background.endFill();

			background.interactive = true;

			background.on('pointertap', event => this._pointerTapped(event));

			this._app.stage.addChild(background);
			this._displayObjects.background = background;

			// リザルト
			const result = new PIXI.Graphics();

			result.beginFill(0xffffff, 0.5);
			result.drawRect(0, 0, this._width, this._height);
			result.endFill();

			result.visible = false;

			this._app.stage.addChild(result);
			this._displayObjects.result = result;

			const textStyle = new PIXI.TextStyle({fontFamily: 'Arial', fontSize: this._height * 0.13, fontStyle: 'italic', fontWeight: 'bold', fill: 0xffffff, strokeThickness: this._height * 0.018, stroke: 0xe0e0e0});
			const resultTitle = new PIXI.Text('', textStyle);

			resultTitle.anchor.set(0.5);
			resultTitle.position.set(this._width * 0.5, this._height * 0.3);

			result.addChild(resultTitle);
			this._displayObjects.resultTitle = resultTitle;

		}

		setStage(data) {

			this._field = new Field(data.row, data.column, data.mine);

			this._cellWidth = this._width / data.column;
			this._cellHeight = this._height / data.row;

			// アフター画像
			const textureAfter = PIXI.Texture.from(data.after);
			const spriteAfter = new PIXI.Sprite(textureAfter);

			this._displayObjects.background.addChild(spriteAfter);

			// 爆弾数・爆弾表示
			const textStyle = new PIXI.TextStyle({fontFamily: 'Arial', fontSize: this._cellHeight, fill: 0xe0e0e0});

			this._displayObjects.cells = [];
			const cells = this._displayObjects.cells;
			for (let row = 0; row < data.row; row++) {
				cells[row] = [];
				for (let column = 0; column < data.column; column++) {

					// 
					const text = new PIXI.Text('', textStyle);

					text.anchor.set(0.5);

					text.position.set(this._cellWidth * (column + 0.5), this._cellHeight * (row + 0.5));

					this._displayObjects.background.addChild(text);

					// 
					this._displayObjects.cells[row][column] = {text};

				}
			}

			// ビフォー画像
			const textureBefore = PIXI.Texture.from(data.before);
			const spriteBefore = new PIXI.Sprite(textureBefore);

			const renderTexture = PIXI.RenderTexture.create(this._width, this._height);
			const renderTextureSprite = new PIXI.Sprite(renderTexture);

			spriteBefore.mask = renderTextureSprite;

			// ビフォー画像マスク描画
			const mask = new PIXI.Graphics();

			mask.beginFill(0xff0000);
			mask.drawRect(0, 0, this._width, this._height);
			mask.endFill();

			this._app.renderer.render(mask, renderTexture, false);

			// ビフォー画像表示
			this._app.stage.addChild(renderTextureSprite);
			this._displayObjects.background.addChild(spriteBefore);

			// 
			this._displayObjects.mask = mask;
			this._displayObjects.renderTextureSprite = renderTextureSprite;

		}

		_pointerTapped(event) {

			if ( this._finished ) return;

			// 
			const position = event.data.getLocalPosition(event.currentTarget);

			const startRow = Math.floor(position.y / this._cellHeight);
			const startColumn = Math.floor(position.x / this._cellWidth);

			// 最初のタップ時にフィールド生成
			if ( ! this._field.created ) {
				this._field.create(startRow, startColumn, (row, column) => {
					this._updateCell(row, column);
				});
			}

			// ゲームオーバー判定
			if ( this._field.isMine(startRow, startColumn) ) {
				this._displayObjects.resultTitle.text = 'OUT!!!';
				this._displayObjects.result.visible = true;
				this._finished = true;
				return;
			}

			// セルを開く
			this._field.reveal(startRow, startColumn, (row, column) => {
				this._updateCellRevealed(row, column);
			});

			// クリア判定
			if ( this._field.cleared ) {
				this._displayObjects.resultTitle.text = 'CLEAR!!';
				this._displayObjects.result.visible = true;
				this._finished = true;
				return;
			}

		}

		_updateCell(row, column) {

			const cells = this._displayObjects.cells;

			if ( this._field.isMine(row, column) ) {
				cells[row][column].text.text = '●';
			} else if ( this._field.count(row, column) > 0 ) {
				cells[row][column].text.text = '' + this._field.count(row, column);
			} else {
				cells[row][column].text.text = '';
			}

		}

		_updateCellRevealed(row, column) {
			const cells = this._displayObjects.cells;
			if ( this._field.revealed(row, column) ) {

				const mask = this._displayObjects.mask;
				const renderTexture = this._displayObjects.renderTextureSprite.texture;

				const x = this._cellWidth * column;
				const y = this._cellHeight * row;
				const width = this._cellWidth;
				const height = this._cellHeight;

				mask.beginFill(0x000000);
				mask.drawRect(x, y, width, height);
				mask.endFill();

				this._app.renderer.render(mask, renderTexture, false);

			}
		}

	};

})();
