import {expect} from "chai";
import {readFileSync} from "fs";
import {UpdateMetadata} from "../app/src/updater/UpdateMetadata";
import * as pack from "../app/package.json";

const testKeyset = pack.updateSignatureKeyset.concat([
  "untrusted comment: minisign public key DFAE6029AA04EBA8\nRWSo6wSqKWCu39Rvw1Oc7Eqk7y3fqUyxRC4Djmy2b2LItIfBGNgRQaAl\n",
  "untrusted comment: minisign public key C2BECB8B6549E9DF\nRWTf6Ulli8u+wttD0hup3iiznHHA7wLPcw9hSNP3YaoF8w/ivnuHqKoC\n",
  "untrusted comment: minisign public key C0A58C03E58F1FDE\nRWTeH4/lA4ylwPynPf6IJM2K+ipZj/8ANt0tw1GRJ4Cu8GgwooKY3sFa\n",
]);

describe("UpdateMetadata", () => {
  describe("Initialization from toy signature", () => {
    it("Testing initialization", () => {
      const file = readFileSync("./test/testdata/sample.json", "utf-8");

      const updateMetadata = new UpdateMetadata(file, testKeyset);

      const result = updateMetadata.signature;

      expect(result.toString()).to.equal("helloworldsignature");
    });
  });

  describe("Initialization from real signature", () => {
    it("Testing initialization", () => {
      const file = readFileSync("./test/testdata/signed_sample.json", "utf-8");

      const updateMetadata = new UpdateMetadata(file, testKeyset);

      const result = updateMetadata.signature;

      const expected = `untrusted comment: signature from minisign secret key
RWSo6wSqKWCu3wJo/nzi+vfNpZ7hWKeVXTC/EN/X6qEYKcCAAp21O/ArC8MUmagOMDZFUel41UDXTB1zRzJWACyv84AtHCFNiAw=
trusted comment: timestamp:1624971028	file:signed_sample.json
9EnX2nPKfZHx05gC1wgHOG2yviqH7uf4Q+yztK7rMh1lKC5xuA0a4WTadef+iros9K2pktGCO8SRKCPYZUc/Ag==
`;

      expect(result.toString()).to.equal(expected);
    });
  });

  describe("Checking correct signature", () => {
    it("Checking correct signature from test key set should succeed", () => {
      const file = readFileSync("./test/testdata/signed_sample.json", "utf-8");

      const updateMetadata = new UpdateMetadata(file, testKeyset);

      const result = updateMetadata.containsValidMetadataSignature();

      expect(result).to.equal(true);
    });
  });

  describe("Checking generated correct signature", () => {
    it("Checking correct signature from test key set should succeed", () => {
      const file = readFileSync(
        "./test/testdata/generated_sample.json",
        "utf-8",
      );

      const updateMetadata = new UpdateMetadata(file, testKeyset);

      const result = updateMetadata.containsValidMetadataSignature();

      expect(result).to.equal(true);
    });
  });

  describe("Checking correct signature", () => {
    it("Checking correct signature with package keyset should succeed", () => {
      const file = readFileSync("./test/testdata/signed_sample.json", "utf-8");

      const updateMetadata = new UpdateMetadata(file, testKeyset);

      const result = updateMetadata.containsValidMetadataSignature();

      expect(result).to.equal(true);
    });
  });

  describe("Checking correct production signature", () => {
    it("Checking correct production signature with package keyset should succeed", () => {
      const file = readFileSync(
        "./test/testdata/correct_signed_prod.json",
        "utf-8",
      );

      const updateMetadata = new UpdateMetadata(file, testKeyset);

      const result = updateMetadata.containsValidMetadataSignature();

      expect(result).to.equal(true);
    });
  });

  describe("Checking incorrect signature", () => {
    it("Checking incorrect signature should fail", () => {
      const file = readFileSync(
        "./test/testdata/incorrect_signed_sample.json",
        "utf-8",
      );

      const updateMetadata = new UpdateMetadata(file, testKeyset);

      const result = updateMetadata.containsValidMetadataSignature();

      expect(result).to.equal(false);
    });
  });

  describe("Checking empty signature", () => {
    it("Checking an empty signature should fail", () => {
      const file = readFileSync(
        "./test/testdata/unsigned_sample.json",
        "utf-8",
      );

      const updateMetadata = new UpdateMetadata(file, testKeyset);

      const result = updateMetadata.containsValidMetadataSignature();

      expect(result).to.equal(false);
    });
  });
});

describe("Check binary signature verification", () => {
  describe("Test that correct signature succeeds and incorrect signature fails", () => {
    it("Test Correct signature", () => {
      const file = readFileSync(
        "./test/testdata/binary_signature_only_correct.json",
        "utf-8",
      );
      const blobUrl = "./test/testdata/testfile.dat";

      const updateMetadata = new UpdateMetadata(file, testKeyset);

      const result = updateMetadata.blobContainsValidSignature(blobUrl);

      expect(result).to.equal(true);
    });

    it("Test Correct production signature", () => {
      const file = readFileSync(
        "./test/testdata/binary_signature_only_correct_alpha_key.json",
        "utf-8",
      );
      const blobUrl = "./test/testdata/testfile.dat";

      const updateMetadata = new UpdateMetadata(file, testKeyset);

      const result = updateMetadata.blobContainsValidSignature(blobUrl);

      expect(result).to.equal(true);
    });

    it("Test Correct backup key signature", () => {
      const file = readFileSync(
        "./test/testdata/binary_signature_only_correct_backup_key.json",
        "utf-8",
      );
      const blobUrl = "./test/testdata/testfile.dat";

      const updateMetadata = new UpdateMetadata(file, testKeyset);

      const result = updateMetadata.blobContainsValidSignature(blobUrl);

      expect(result).to.equal(true);
    });

    it("Test Correct Production Key Signature", () => {
      const file = readFileSync(
        "./test/testdata/binary_signature_only_correct_new_prod_key.json",
        "utf-8",
      );
      const blobUrl = "./test/testdata/testfile.dat";

      const updateMetadata = new UpdateMetadata(file, testKeyset);

      const result = updateMetadata.blobContainsValidSignature(blobUrl);

      expect(result).to.equal(true);
    });

    it("Test Incorrect signature", () => {
      const file = readFileSync(
        "./test/testdata/binary_signature_only_incorrect.json",
        "utf-8",
      );
      const blobUrl = "./test/testdata/testfile.dat";

      const updateMetadata = new UpdateMetadata(file, testKeyset);

      const result = updateMetadata.blobContainsValidSignature(blobUrl);

      expect(result).to.equal(false);
    });
  });
});
