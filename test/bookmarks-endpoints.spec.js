const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const { makeBookmarksToTest } = require('./bookmarks.fixtures');

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
    });

    describe('GET /bookmarks/:bookmark_id', () => {

        context('Given no matching bookmarks in database', () => {
            it('responds with 404', () => {
                const bookmarkId = 823492;
                return supertest(app)
                    .get(`/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { error: { message: `Bookmark not found` } })
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
    });
});