import appc from '../src/index';

describe('util', () => {
	describe('mergeDeep()', () => {
		it('should merge two objects together', () => {
			const obj = appc.util.mergeDeep({ a: 1 }, { b: 2 });
			expect(obj).to.deep.equal({ a: 1, b: 2 });
		});

		it('should create a dest object', () => {
			const obj = appc.util.mergeDeep(null, { b: 2 });
			expect(obj).to.deep.equal({ b: 2 });
		});

		it('should return original dest object if source not an object', () => {
			const orig = { b: 2 };
			const obj = appc.util.mergeDeep(orig);
			expect(obj).to.equal(orig);

			const obj2 = appc.util.mergeDeep(orig, 'foo');
			expect(obj2).to.equal(orig);
		});

		it('should merge deeply nested properties', () => {
			const fn = () => {};

			const obj = appc.util.mergeDeep(
				{
					a: 1,
					d: null,
					g: []
				},
				{
					a: 2,
					b: 3,
					c: [ 'x', 'y', 'z' ],
					d: { fn: fn },
					e: undefined,
					f: null,
					g: { foo: 'bar' }
				}
			);

			expect(obj).to.deep.equal({
				a: 2,
				b: 3,
				c: [ 'x', 'y', 'z' ],
				d: { fn: fn },
				f: null,
				g: { foo: 'bar' }
			});
		});
	});

	describe('cache()', () => {
		afterEach(() => {
			appc.util.clearCache();
		});

		it('should error if namespace is not a string', () => {
			expect(() => {
				appc.util.cache();
			}).to.throw(TypeError, 'Expected namespace to be a non-empty string');

			expect(() => {
				appc.util.cache(123);
			}).to.throw(TypeError, 'Expected namespace to be a non-empty string');
		});

		it('should error if fn is not a function', () => {
			expect(() => {
				appc.util.cache('foo', 'bar');
			}).to.throw(TypeError, 'Expected fn to be a function');

			expect(() => {
				appc.util.cache('foo', true, 'bar');
			}).to.throw(TypeError, 'Expected fn to be a function');
		});

		it('should cache a value', done => {
			const obj = { foo: 'bar' };
			appc.util.cache('foo', () => obj)
				.then(value => {
					expect(value).to.be.an.Object;
					expect(value).to.equal(obj);
					done();
				})
				.catch(done);
		});

		it('should pull from cache', done => {
			const obj = { foo: 'bar' };
			const obj2 = { baz: 'wiz' };

			appc.util.cache('foo', () => obj)
				.then(value => {
					expect(value).to.be.an.Object;
					expect(value).to.equal(obj);

					return appc.util.cache('foo', () => obj2)
						.then(value2 => {
							expect(value2).to.be.an.Object;
							expect(value2).to.equal(obj);
						});
				})
				.then(() => done())
				.catch(done);
		});

		it('should bypass cache', done => {
			const obj = { foo: 'bar' };
			const obj2 = { baz: 'wiz' };

			appc.util.cache('foo', () => obj)
				.then(value => {
					expect(value).to.be.an.Object;
					expect(value).to.equal(obj);

					return appc.util.cache('foo', true, () => obj2)
						.then(value2 => {
							expect(value2).to.be.an.Object;
							expect(value2).to.equal(obj2);
						});
				})
				.then(() => done())
				.catch(done);
		});

		it('should queue up multiple calls', done => {
			const obj = { foo: 'bar' };
			let count = 0;

			const fn = () => {
				return appc.util
					.cache('foo', () => {
						count++;
						return obj;
					})
					.then(value => {
						expect(value).to.be.an.Object;
						expect(value).to.equal(obj);
					});
			};

			Promise
				.all([ fn(), fn(), fn() ])
				.then(() => {
					expect(count).to.equal(1);
					done();
				})
				.catch(done);
		});

		it('should queue up multiple async calls', done => {
			const obj = { foo: 'bar' };
			let count = 0;

			const fn = () => {
				return appc.util
					.cache('foo', () => new Promise(resolve => {
						count++;
						resolve(obj);
					}))
					.then(value => {
						expect(value).to.be.an.Object;
						expect(value).to.equal(obj);
					});
			};

			Promise
				.all([ fn(), fn(), fn() ])
				.then(() => {
					expect(count).to.equal(1);
					done();
				})
				.catch(done);
		});

		it('should catch errors', done => {
			appc.util
				.cache('foo', () => {
					throw new Error('oh snap');
				})
				.then(() => {
					done(new Error('Expected error to be caught'));
				})
				.catch(err => {
					expect(err).to.be.instanceof(Error);
					expect(err.message).to.equal('oh snap');
					done();
				});
		});
	});

	describe('clearCache()', () => {
		afterEach(() => {
			appc.util.clearCache();
		});

		it('should clear a specific namespace', done => {
			const obj = { foo: 'bar' };
			const obj2 = { baz: 'wiz' };

			appc.util.cache('foo', () => obj)
				.then(value => {
					expect(value).to.be.an.Object;
					expect(value).to.equal(obj);

					appc.util.clearCache('foo');

					return appc.util.cache('foo', () => obj2)
						.then(value2 => {
							expect(value2).to.be.an.Object;
							expect(value2).to.equal(obj2);
						});
				})
				.then(() => done())
				.catch(done);
		});

		it('should clear all namespaces', done => {
			const obj = { foo: 'bar' };
			const obj2 = { baz: 'wiz' };

			Promise
				.all([
					appc.util.cache('foo', () => obj).then(value => {
						expect(value).to.be.an.Object;
						expect(value).to.equal(obj);
					}),
					appc.util.cache('bar', () => obj).then(value => {
						expect(value).to.be.an.Object;
						expect(value).to.equal(obj);
					})
				])
				.then(() => {
					appc.util.clearCache();

					return Promise
						.all([
							appc.util.cache('foo', () => obj2).then(value2 => {
								expect(value2).to.be.an.Object;
								expect(value2).to.equal(obj2);
							}),
							appc.util.cache('bar', () => obj2).then(value2 => {
								expect(value2).to.be.an.Object;
								expect(value2).to.equal(obj2);
							})
						]);
				})
				.then(() => done())
				.catch(done);
		});
	});

	describe('sha1()', () => {
		it('should hash a string', () => {
			const h1 = appc.util.sha1('foo');
			expect(h1).to.be.a.String;
			expect(h1).to.have.lengthOf(40);

			const h2 = appc.util.sha1('bar');
			expect(h2).to.be.a.String;
			expect(h2).to.have.lengthOf(40);

			expect(h1).to.not.equal(h2);
		});
	});

	describe('randomBytes()', () => {
		it('should return 0 random bytes', () => {
			const r = appc.util.randomBytes(0);
			expect(r).to.be.a.String;
			expect(r).to.have.lengthOf(0);
		});

		it('should return 1 random byte', () => {
			const r = appc.util.randomBytes(1);
			expect(r).to.be.a.String;
			expect(r).to.have.lengthOf(2);
		});

		it('should return 2 random bytes', () => {
			const r = appc.util.randomBytes(2);
			expect(r).to.be.a.String;
			expect(r).to.have.lengthOf(4);
		});

		it('should return 20 random bytes', () => {
			const r = appc.util.randomBytes(20);
			expect(r).to.be.a.String;
			expect(r).to.have.lengthOf(40);
		});
	});
});
