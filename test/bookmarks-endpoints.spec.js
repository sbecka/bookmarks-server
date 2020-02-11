const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const { makeBookmarksToTest, makeMaliciousBookmark } = require('./bookmarks.fixtures');

describe.only('Bookmarks Endpoints', function() {
    let db;

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL
        });
        app.set('db', db)
    });

    after('disconnect from db', () => db.destroy());

    before('clean the table', () => db('bookmarks').truncate());

    afterEach('cleanup', () => db('bookmarks').truncate());

    describe(`Unauthorized requests`, () => {
        const testBookmarks = makeBookmarksToTest()
    
        beforeEach('insert bookmarks', () => {
          return db
            .into('bookmarks')
            .insert(testBookmarks)
        });
    
        it(`responds with 401 Unauthorized for GET /api/bookmarks`, () => {
          return supertest(app)
            .get('/api/bookmarks')
            .expect(401, { error: 'Unauthorized request' })
        });
    
        it(`responds with 401 Unauthorized for POST /api/bookmarks`, () => {
          return supertest(app)
            .post('/api/bookmarks')
            .send({ title: 'test-title', url: 'http://some.thing.com', rating: 1 })
            .expect(401, { error: 'Unauthorized request' })
        });
    
        it(`responds with 401 Unauthorized for GET /api/bookmarks/:id`, () => {
          const secondBookmark = testBookmarks[1]
          return supertest(app)
            .get(`/api/bookmarks/${secondBookmark.id}`)
            .expect(401, { error: 'Unauthorized request' })
        });
    
        it(`responds with 401 Unauthorized for DELETE /api/bookmarks/:id`, () => {
          const aBookmark = testBookmarks[1]
          return supertest(app)
            .delete(`/api/bookmarks/${aBookmark.id}`)
            .expect(401, { error: 'Unauthorized request' })
        });
    });

    describe('GET /api/bookmarks', () => {

        context('Given no bookmarks', () => {
            it('responds with 200 and an empty list', () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, [])
            });
        });

        context('Given there are bookmarks in database', () => {
            const testBookmarks = makeBookmarksToTest();

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            });

            it('GET /api/bookmarks responds with 200 and all of the articles', () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, testBookmarks)
            });
        });

        context(`Given an XSS attack bookmark`, () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();
      
            beforeEach('insert malicious bookmark', () => {
              return db
                .into('bookmarks')
                .insert([maliciousBookmark])
            });
      
            it('removes XSS attack content', () => {
              return supertest(app)
                .get(`/api/bookmarks`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(200)
                .expect(res => {
                  expect(res.body[0].title).to.eql(expectedBookmark.title)
                  expect(res.body[0].description).to.eql(expectedBookmark.description)
                })
            });
        });
    });

    describe('GET /api/bookmarks/:bookmark_id', () => {

        context('Given no matching bookmarks in database', () => {
            it('responds with 404', () => {
                const bookmarkId = 823492;
                return supertest(app)
                    .get(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { 
                        error: { message: `Bookmark Not Found` } 
                    })
            });
        });

        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksToTest();

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            });

            it('GET /api/bookmarks/:bookmark_id responds with 200 and the requested bookmark', () => {
                const bookmarkId = 2;
                const expectedBookmark = testBookmarks[bookmarkId - 1];
                return supertest(app)
                    .get(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, expectedBookmark)
            });
        });

        context(`Given an XSS attack bookmark`, () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();
      
            beforeEach('insert malicious bookmark', () => {
              return db
                .into('bookmarks')
                .insert([maliciousBookmark])
            })
      
            it('removes XSS attack content', () => {
              return supertest(app)
                .get(`/api/bookmarks/${maliciousBookmark.id}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(200)
                .expect(res => {
                  expect(res.body.title).to.eql(expectedBookmark.title)
                  expect(res.body.description).to.eql(expectedBookmark.description)
                })
            });
        });
    });

    describe('POST /api/bookmarks', () => {
        it('creates a new bookmark, responds with 201 and the new bookmark', () => {
            const newBookmark = {
                title: 'New Title',
                url: 'https://www.newtestwebsite.com/',
                description: 'New bookmark description here', 
                rating: 5
            };

            return supertest(app)
                .post(`/api/bookmarks`)
                .send(newBookmark)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(newBookmark.title)
                    expect(res.body.url).to.eql(newBookmark.url)
                    expect(res.body.description).to.eql(newBookmark.description)
                    expect(res.body.rating).to.eql(newBookmark.rating)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`)
                })
                .then(res =>
                    supertest(app)
                        .get(`/api/bookmarks/${res.body.id}`)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(res.body)
                )
        });

        it(`responds with 400 and an error message when 'title' is missing`, () => {
            return supertest(app)
                .post('/api/bookmarks')
                .send({
                    url: 'https://www.newtestwebsite.com/',
                    description: 'New bookmark description here', 
                    rating: 5
                })
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, {
                    error: { message: `'title' is required`}
                })
        });

        it(`responds with 400 and an error message when 'url' is missing`, () => {
            return supertest(app)
                .post('/api/bookmarks')
                .send({
                    title: 'New title',
                    description: 'New bookmark description here', 
                    rating: 5
                })
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, {
                    error: { message: `'url' is required`}
                })
        });

        it(`responds with 400 and an error message when 'rating' is missing`, () => {
            return supertest(app)
                .post('/api/bookmarks')
                .send({
                    title: 'New title',
                    url: 'https://www.newtestwebsite.com/',
                    description: 'New bookmark description here'
                })
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, {
                    error: { message: `'rating' is required`}
                })
        });

        it(`responds with 400 when rating is not between 1 and 5`, () => {
            
            return supertest(app)
                .post('/api/bookmarks')
                .send({
                    title: 'New title',
                    url: 'https://www.newtestwebsite.com/',
                    description: 'New bookmark description here',
                    rating: 6
                })
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, 'Rating should be a number between 1 and 5.')
        });

        it('removes XSS attack content', () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();
            return supertest(app)
                .post(`/api/bookmarks`)
                .send(maliciousBookmark)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(expectedBookmark.title)
                    expect(res.body.description).to.eql(expectedBookmark.description)
                })
        });
    });



    describe('DELETE /api/bookmarks/:bookmark_id', () => {
        context(`Given no bookmarks`, () => {
            it(`responds 404 when bookmark doesn't exist`, () => {
                const bookmarkId = 123;
                return supertest(app)
                    .delete(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {
                        error: { message: `Bookmark Not Found` }
                    })
            })
        })

        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksToTest();

            beforeEach('insert bookmarks', () => {
                return db.into('bookmarks').insert(testBookmarks)
            });

            it(`responds with 204 and remove the bookmark`, () => {
                const idToRemove = 1;
                const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove);

                return supertest(app)
                    .delete(`/api/bookmarks/${idToRemove}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then(() => {
                        supertest(app)
                            .get('/api/bookmarks')
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmarks)
                    })
            });
        });
    });

    describe.only('PATCH /api/bookmarks/:bookmark_id', () => {
        context('No bookmarks in database', () => {
            it('responds with 404 when the bookmark does not exist', () => {
                const randomId = 12345;
                return supertest(app)
                    .patch(`/api/bookmarks/${randomId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { 
                        error: { message: `Bookmark Not Found` } 
                    })
            });
        });

        context('Given bookmarks in database', () => {
            const testBookmarks = makeBookmarksToTest();

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            });

            it('responds with 204 and updates bookmark', () => {
                const idToUpdate = 3;
                const updateBookmark = {
                    title: '3 Carrots!',
                    description: '3 carrots restaurant is amazing!',
                    url: 'https://www.3estwebsite.com/',
                    rating: 5
                };

                const expectedBookmark = {
                    ...testBookmarks[idToUpdate - 1],
                    ...updateBookmark
                };

                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .send(updateBookmark)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then(res => {
                        return supertest(app)
                            .get(`/api/bookmarks/${idToUpdate}`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmark)
                    })
            });

            it('responds with 400 when no values are supplied for any fields', () => {
                const idToUpdate = 3;
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .send({ notValidField: 'no value' })
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(400, {
                        error: {
                            message: `Request body must contain either 'title', 'url', 'description', or 'rating'`
                        }
                    })
            });

            it('responds with 204 when updating with given fields', () => {
                const idToUpdate = 3;
                const updateBookmark = {
                    title: 'The Best Carrots!'
                };
                const expectedBookmark = {
                    ...testBookmarks[idToUpdate - 1],
                    ...updateBookmark
                };

                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .send({
                        ...updateBookmark,
                        notValidField: 'Do not update with this' 
                    })
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then(res => {
                        return supertest(app)
                            .get(`/api/bookmarks/${idToUpdate}`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmark)
                    })
            });

            it(`responds with 400 invalid 'rating' if not between 0 and 5`, () => {
                const idToUpdate = 2
                const updateInvalidRating = {
                  rating: 'invalid',
                }
                return supertest(app)
                  .patch(`/api/bookmarks/${idToUpdate}`)
                  .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                  .send(updateInvalidRating)
                  .expect(400, 'Rating should be a number between 1 and 5.')
            });
        });
    });
});