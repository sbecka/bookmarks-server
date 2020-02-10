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
        const testBookmarks = makeBookmarksArray()
    
        beforeEach('insert bookmarks', () => {
          return db
            .into('bookmarks')
            .insert(testBookmarks)
        });
    
        it(`responds with 401 Unauthorized for GET /bookmarks`, () => {
          return supertest(app)
            .get('/bookmarks')
            .expect(401, { error: 'Unauthorized request' })
        });
    
        it(`responds with 401 Unauthorized for POST /bookmarks`, () => {
          return supertest(app)
            .post('/bookmarks')
            .send({ title: 'test-title', url: 'http://some.thing.com', rating: 1 })
            .expect(401, { error: 'Unauthorized request' })
        });
    
        it(`responds with 401 Unauthorized for GET /bookmarks/:id`, () => {
          const secondBookmark = testBookmarks[1]
          return supertest(app)
            .get(`/bookmarks/${secondBookmark.id}`)
            .expect(401, { error: 'Unauthorized request' })
        });
    
        it(`responds with 401 Unauthorized for DELETE /bookmarks/:id`, () => {
          const aBookmark = testBookmarks[1]
          return supertest(app)
            .delete(`/bookmarks/${aBookmark.id}`)
            .expect(401, { error: 'Unauthorized request' })
        });
    });

    describe('GET /bookmarks', () => {

        context('Given no articles', () => {
            it('responds with 200 and an empty list', () => {
                return supertest(app)
                    .get('/bookmarks')
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

            it('Get /bookmarks responds with 200 and all of the articles', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, testBookmarks)
            });
        });

        context.only(`Given an XSS attack bookmark`, () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()
      
            beforeEach('insert malicious bookmark', () => {
              return db
                .into('bookmarks')
                .insert([maliciousBookmark])
            });
      
            it('removes XSS attack content', () => {
              return supertest(app)
                .get(`/bookmarks`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(200)
                .expect(res => {
                  expect(res.body[0].title).to.eql(expectedBookmark.title)
                  expect(res.body[0].description).to.eql(expectedBookmark.description)
                })
            });
        });
    });

    describe('GET /bookmarks/:bookmark_id', () => {

        context.only('Given no matching bookmarks in database', () => {
            it('responds with 404', () => {
                const bookmarkId = 823492;
                return supertest(app)
                    .get(`/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { 
                        error: { message: `Bookmark not found` } 
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

            it('GET /bookmarks/:bookmark_id responds with 200 and the requested bookmark', () => {
                const bookmarkId = 2;
                const expectedBookmark = testBookmarks[bookmarkId - 1];
                return supertest(app)
                    .get(`/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, expectedBookmark)
            });
        });

        context.only(`Given an XSS attack bookmark`, () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();
      
            beforeEach('insert malicious bookmark', () => {
              return db
                .into('bookmarks')
                .insert([maliciousBookmark])
            })
      
            it('removes XSS attack content', () => {
              return supertest(app)
                .get(`/bookmarks/${maliciousBookmark.id}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(200)
                .expect(res => {
                  expect(res.body.title).to.eql(expectedBookmark.title)
                  expect(res.body.description).to.eql(expectedBookmark.description)
                })
            });
        });
    });

    describe('POST /bookmarks', () => {
        it('creates a new bookmark, responds with 201 and the new bookmark', () => {
            const newBookmark = {
                title: 'New Title',
                url: 'https://www.newtestwebsite.com/',
                description: 'New bookmark description here', 
                rating: 5
            };

            return supertest(app)
                .post(`/bookmarks`)
                .send(newBookmark)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(newBookmark.title)
                    expect(res.body.url).to.eql(newBookmark.url)
                    expect(res.body.description).to.eql(newBookmark.description)
                    expect(res.body.rating).to.eql(newBookmark.rating)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`)
                })
                .then(res =>
                    supertest(app)
                        .get(`/bookmarks/${res.body.id}`)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(res.body)
                )
        });

        it(`responds with 400 and an error message when 'title' is missing`, () => {
            return supertest(app)
                .post('/bookmarks')
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
                .post('/bookmarks')
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
                .post('/bookmarks')
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
                .post('/bookmarks')
                .send({
                    title: 'New title',
                    url: 'https://www.newtestwebsite.com/',
                    description: 'New bookmark description here',
                    rating: 6
                })
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, 'Rating should be a number between 1 and 5.')
        });

        it.only('removes XSS attack content', () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();
            return supertest(app)
                .post(`/bookmarks`)
                .send(maliciousBookmark)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(expectedBookmark.title)
                    expect(res.body.description).to.eql(expectedBookmark.description)
                })
        });
    });



    describe('DELETE /bookmarks/:bookmark_id', () => {
        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksToTest();

            beforeEach('insert bookmarks', () => {
                return db.into('bookmarks').insert(testBookmarks)
            });

            it(`responds with 204 and remove the bookmark`, () => {
                const idToRemove = 1;
                const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove);

                return supertest(app)
                    .delete(`/bookmarks/${idToRemove}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then(() => {
                        supertest(app)
                            .get('/bookmarks')
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmarks)
                    })
            });
        });
    });
});