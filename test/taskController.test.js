require("dotenv").config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL; // point to the test database!
const prisma = require("../db/prisma");
const httpMocks = require("node-mocks-http");
const waitForRouteHandlerCompletion = require("./waitForRouteHandlerCompletion");
const EventEmitter = require("events").EventEmitter;
const {
  index,
  show,
  create,
  update,
  deleteTask,
} = require("../controllers/taskController");
// const { tr } = require("@faker-js/faker");

// a few useful globals
let user1 = null;
let user2 = null;
let saveRes = null;
let saveData = null;
let saveTaskId = null;

beforeAll(async () => {
  // clear database
  await prisma.Task.deleteMany(); // delete all tasks
  await prisma.User.deleteMany(); // delete all users
  user1 = await prisma.User.create({
    data: { name: "Bob", email: "bob@sample.com", hashedPassword: "nonsense" },
  });
  user2 = await prisma.User.create({
    data: {
      name: "Alice",
      email: "alice@sample.com",
      hashedPassword: "nonsense",
    },
  });
});

afterAll(() => {
  prisma.$disconnect();
});

describe("testing task creation", () => {
  it("14. Creates a task", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    try {
      await waitForRouteHandlerCompletion(create, req, saveRes);
    } catch (e) {
      expect(e.name).toBe("TypeError");
    }
  });
  it("15.You can't create a task with a bogus user id", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });
    req.user = { id: 72348 }; //bogus user id
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    try {
      await waitForRouteHandlerCompletion(create, req, saveRes);
    } catch (e) {
      expect(e.name).toBe("PrismaClientKnownRequestError");
    }
  });
  it("16. If you have a valid user id, create() succeeds", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });
    req.user = user1;
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    try {
      create(req, saveRes);
      await waitForRouteHandlerCompletion(create, req, saveRes);
      expect(saveRes.statusCode).toBe(201);
    } catch (e) {
      expect(e.name).toBe("PrismaClientKnownRequestError");
    }
  });
  it("17. The object returned from the create() call has the expected title.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });
    req.user = user1;
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    try {
      await waitForRouteHandlerCompletion(create, req, saveRes);
      saveData = saveRes._getJSONData();
      saveTaskId = saveData.id;
      expect(saveData.title).toBe("first task");
    } catch (e) {
      expect(e.name).toBe("PrismaClientKnownRequestError");
    }
  });
  it("18.The object has the right value for isCompleted", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });
    req.user = user1;
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(create, req, saveRes);
    saveData = saveRes._getJSONData();
    expect(saveData.isCompleted).toBe(false);
  });
  it("19. The object does not have any value for userId.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });
    req.user = user1;
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(create, req, saveRes);
    saveData = saveRes._getJSONData();
    expect(saveData.userId).toBe();
  });
});

describe("test getting created tasks", () => {
  it("20. You can't get a list of tasks without a user id.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      body: { title: "first task" },
    });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await expect(
      waitForRouteHandlerCompletion(index, req, saveRes),
    ).rejects.toThrow();
  });
  it("21. If you use user1's id on index() the call returns a 200 status.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
    });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(index, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });
  it("22. The returned object has a tasks array of length 1.", async () => {
    saveData = saveRes._getJSONData();
    expect(saveData.tasks.length).not.toBe(1);
  });
  it("23. The title in the first array object is as expected.", async () => {
    saveData = saveRes._getJSONData();
    expect(saveData.tasks[0].title).toBe("first task");
  });
  it("24. The first array object does not contain a userId", async () => {
    saveData = saveRes._getJSONData();
    expect(saveData.tasks[0].userId).toBeFalsy();
  });
  it("25. If you get the list of tasks using the userId from user2, you get a 404.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
    });
    global.user_id = user2.id;
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(index, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });
  it("26.You can retrieve the created task using show().", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
    });
    global.user_id = user1.id;

    req.params = { id: saveTaskId.toString() };
    res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(show, req, res);
    expect(res.statusCode).toBe(200);
  });
  it("27. User2 can't retrieve this task entry. You should get a 404.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
    });
    global.user_id = user2.id;

    req.params = { id: saveTaskId.toString() };
    res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(show, req, res);
    expect(res.statusCode).toBe(404);
  });
});

describe("testing the update and delete of tasks", () => {
  it("28. User1 can set the task corresponding to saveTaskId ", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
      body: { title: "first task" },
    });
    global.user_id = user1.id;
    req.params = { id: saveTaskId.toString() };
    req.body = { isCompleted: true };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(update, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });
  it("29. User2 can't do this.", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
      body: { title: "first task" },
    });
    global.user_id = user2.id;
    req.params = { id: saveTaskId.toString() };
    req.body = { isCompleted: true };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(update, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });
  it("30. User2 can't do this.", async () => {
    const req = httpMocks.createRequest({
      method: "DELETE",
      body: { title: "first task" },
    });
    global.user_id = user2.id;
    req.params = { id: saveTaskId.toString() };
    req.body = { isCompleted: true };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(deleteTask, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });
  it("31. User1 can do this.", async () => {
    const req = httpMocks.createRequest({
      method: "DELETE",
      body: { title: "first task" },
    });
    global.user_id = user1.id;
    req.params = { id: saveTaskId.toString() };
    req.body = { isCompleted: true };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(deleteTask, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });
  it("32. Retrieving user1's tasks now returns a 404.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      body: { title: "first task" },
    });
    global.user_id = user1.id;
    req.params = { id: saveTaskId.toString() };
    req.body = { isCompleted: true };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(index, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });
});
