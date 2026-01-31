const { userSchema } = require("../validation/userSchema");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
let isPerson = false;
if (req.body.recaptchaToken) {
  const token = req.body.recaptchaToken;
  const params = new URLSearchParams();
  params.append("secret", process.env.RECAPTCHA_SECRET);
  params.append("response", token);
  params.append("remoteip", req.ip);
  const response = await fetch(
    // might throw an error that would cause a 500 from the error handler
    "https://www.google.com/recaptcha/api/siteverify",
    {
      method: "POST",
      body: params.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );
  const data = await response.json();
  if (data.success) isPerson = true;
  delete req.body.recaptchaToken;
} else if (
  process.env.RECAPTCHA_BYPASS &&
  req.get("X-Recaptcha-Test") === process.env.RECAPTCHA_BYPASS
) {
  // might be a test environment
  isPerson = true;
}
if (!isPerson) {
  return res
    .status(StatusCodes.BAD_REQUEST)
    .json({ message: "We can't tell if you're a person or a bot." });
}

describe("user object validation tests", () => {
  it("1. doesn't permit a trivial password", () => {
    const { error } = userSchema.validate(
      { name: "Bob", email: "bob@sample.com", password: "password" },
      { abortEarly: false },
    );
    expect(
      error.details.find((detail) => detail.context.key == "password"),
    ).toBeDefined();
  });
  it("2. The user schema requires that an email be specified.", () => {
    const { value } = userSchema.validate(
      { name: "Bob", password: "password" },
      { abortEarly: false },
    );
    expect(value.email).toBeDefined();
  });
  it("3. The user schema does not accept an invalid email.", () => {
    const { error } = userSchema.validate(
      { name: "Bob", email: "bob_at_sample.com", password: "password" },
      { abortEarly: false },
    );
    expect(
      error.details.find((detail) => detail.context.key == "email"),
    ).toBeDefined();
  });
  it("4. The user schema requires a password.", () => {
    const { value } = userSchema.validate(
      { name: "Bob", email: "bob@sample.com" },
      { abortEarly: false },
    );
    expect(value.password).toBeDefined();
  });
  it("5.The user schema requires name.", () => {
    const { value } = userSchema.validate(
      { email: "bob@sample.com", password: "password" },
      { abortEarly: false },
    );
    expect(value.name).toBeDefined();
  });
  it("6. The name must be valid (3 to 30 characters).", () => {
    const { error } = userSchema.validate(
      { name: "Bo", email: "bob@sample.com", password: "password" },
      { abortEarly: false },
    );
    expect(
      error.details.find((detail) => detail.context.key === "name"),
    ).toBeDefined();
  });
  it("7.If validation is performed on a valid user object, error comes back falsy.", () => {
    const { error } = userSchema.validate(
      { name: "Bob", email: "bob@sample.com", password: "Pa$$word20" },
      { abortEarly: false },
    );
    expect(error).toBeFalsy();
  });
});

describe("task object validation test", () => {
  it("8. The task schema requires a title", () => {
    const { error } = taskSchema.validate(
      { title: "first task", isCompleted: true },
      { abortEarly: false },
    );

    expect(error).toBeFalsy();
  });
  it("9. If an isCompleted value is specified, it must be valid.", () => {
    const { error } = taskSchema.validate(
      { title: "first task", isCompleted: true },
      { abortEarly: false },
    );

    expect(error.isCompleted).toBeDefined();
  });
  it("10. If an isCompleted value is not specified but the rest of the object is valid, a default of false is provided by validation.", () => {
    const { error } = taskSchema.validate(
      { title: "first task" },
      { abortEarly: false },
    );
    expect(error).toBeFalsy();

    expect(error.isCompleted).toBe(false);
  });
  it("11.If isCompleted in the provided object has the value true, it remains true after validation.", () => {
    const { error, value } = taskSchema.validate(
      { title: "first task", isCompleted: true },
      { abortEarly: false },
    );
    expect(error).toBeFalsy();
    expect(value.isCompleted).toBe(true);
  });
});
describe("patchTaskSchema object validation test", () => {
  it("12. The patchTaskSchema does not require a title", () => {
    const { error } = patchTaskSchema.validate(
      { isCompleted: true },
      { abortEarly: false },
    );

    expect(error).toBeFalsy();
  });
  it("13.  If no value is provided for isCompleted this remains undefined in the returned value.", () => {
    const { value } = patchTaskSchema.validate({ abortEarly: false });
    expect(value.isCompleted).toBeUndefined();
  });
});
