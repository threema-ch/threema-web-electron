import {expect} from "chai";
import {Updater} from "../app/src/updater/updater";

describe("checkSmallerVersionNumber", () => {
  describe("Test Version Compare 1", () => {
    it("Testing initialization", () => {
      expect(Updater.checkSmallerVersionNumber("0.0.1", "0.0.2")).to.equal(
        true,
      );
    });
  });

  describe("Test Version Compare 2", () => {
    it("Testing initialization", () => {
      expect(Updater.checkSmallerVersionNumber("0.0.1", "0.0.1")).to.equal(
        false,
      );
    });
  });

  describe("Test Version Compare 3", () => {
    it("Testing initialization", () => {
      expect(Updater.checkSmallerVersionNumber("0.0.2", "0.0.1")).to.equal(
        false,
      );
    });
  });

  describe("Test Version Compare 4", () => {
    it("Testing initialization", () => {
      expect(
        Updater.checkSmallerVersionNumber("0.0.99999999999", "0.0.1"),
      ).to.equal(false);
    });
  });

  describe("Test Version Compare 5", () => {
    it("Testing initialization", () => {
      expect(
        Updater.checkSmallerVersionNumber("0.0.1-alpha", "0.0.1"),
      ).to.equal(true);
    });
  });

  describe("Test Version Compare 6", () => {
    it("Testing initialization", () => {
      expect(
        Updater.checkSmallerVersionNumber("0.0.1-alpha", "0.0.2"),
      ).to.equal(true);
    });
  });

  describe("Test Version Compare 7", () => {
    it("Testing initialization", () => {
      expect(
        Updater.checkSmallerVersionNumber("0.0.1-alpha", "0.0.1-beta"),
      ).to.equal(true);
    });
  });
});
