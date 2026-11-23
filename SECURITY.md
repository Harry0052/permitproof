# Security

PermitProof keeps its rule data in the repository and does not send an application to a network service. Reports are written only under the `--out` directory you name, and that directory must stay inside the working tree.

## Reporting a vulnerability

Open a private security advisory on the GitHub repository [Harry0052/permitproof](https://github.com/Harry0052/permitproof/security/advisories). Please include the version or commit, the command you ran, and what you expected to happen. Do not include real street addresses, parcel numbers, or other personal data in the report.

There is no private email address for reports.

## Supported use

The supported input is the synthetic fixture described in the README. Do not point the tool at a file of real customer addresses. The sample rejects parcel ids that do not start with `SYN-` and rejects free text that does not contain the word `SYNTHETIC`.
