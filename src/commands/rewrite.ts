import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import shell from "shelljs";
import inquirer from "inquirer";

const rewriteCommand = new Command("rewrite");

/**
 * Executes the git filter-branch command with a given filter script.
 * Handles spinners, success messages, and error handling.
 * @param filterScript The shell script to be used by --env-filter.
 */
async function executeRewrite(filterScript: string) {
  const warning = `
${chalk.yellow.bold(
  "Warning:"
)} This is a destructive operation that rewrites Git history.
It can be very slow on large repositories.
A backup of your history will be stored in ${chalk.cyan("refs/original/")}.
Make sure you have a clean working directory before proceeding.
`;
  console.log(warning);

  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: "Are you sure you want to continue?",
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(chalk.gray("Operation cancelled."));
    return;
  }

  const spinner = ora(
    "Rewriting commit history... (this may take a while)"
  ).start();
  const command = `git filter-branch --force --env-filter '${filterScript}' --tag-name-filter cat -- --branches --tags`;

  shell.exec(
    command,
    {
      silent: true,
      env: { ...process.env, FILTER_BRANCH_SQUELCH_WARNING: "1" },
    },
    (code, stdout, stderr) => {
      if (code === 0) {
        spinner.succeed("Commit history has been rewritten successfully.");
        console.log(
          chalk.green(
            "A backup of the original refs was stored in refs/original/."
          )
        );
        console.log(
          chalk.yellow("Please review your git history to confirm the changes.")
        );
        console.log(
          chalk.yellow(
            "\nTo clean up the backup and finalize the changes, run:"
          )
        );
        console.log(
          chalk.cyan(
            '  git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d'
          )
        );
        console.log(
          chalk.yellow(
            "\nAfter confirming, you may need to force-push to your remote repository:"
          )
        );
        console.log(
          chalk.cyan("  git push --force --tags origin 'refs/heads/*'")
        );
      } else {
        spinner.fail("An error occurred during the rewrite process.");
        console.error(chalk.red(stderr));
        if (stdout) {
          console.error(chalk.grey(stdout));
        }
      }
    }
  );
}

/**
 * Creates a filter script to rewrite author info for all commits.
 */
async function handleRewriteAll() {
  const { newName, newEmail } = await inquirer.prompt([
    {
      type: "input",
      name: "newName",
      message: "Enter the new author name for ALL commits:",
    },
    {
      type: "input",
      name: "newEmail",
      message: "Enter the new author email for ALL commits:",
    },
  ]);

  if (newName && newEmail) {
    const filterScript = `
      export GIT_AUTHOR_NAME="${newName}";
      export GIT_AUTHOR_EMAIL="${newEmail}";
      export GIT_COMMITTER_NAME="${newName}";
      export GIT_COMMITTER_EMAIL="${newEmail}";
    `;
    await executeRewrite(filterScript);
  } else {
    console.log(chalk.red("Author name and email are required. Aborting."));
  }
}

/**
 * Creates a filter script to rewrite author info for commits from a specific email.
 */
async function handleRewriteByEmail() {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "oldEmail",
      message: "Enter the old email address to replace:",
    },
    { type: "input", name: "newName", message: "Enter the new author name:" },
    { type: "input", name: "newEmail", message: "Enter the new author email:" },
  ]);

  if (answers.oldEmail && answers.newName && answers.newEmail) {
    const filterScript = `
      if [ "$GIT_COMMITTER_EMAIL" = "${answers.oldEmail}" ]; then
          export GIT_COMMITTER_NAME="${answers.newName}";
          export GIT_COMMITTER_EMAIL="${answers.newEmail}";
      fi
      if [ "$GIT_AUTHOR_EMAIL" = "${answers.oldEmail}" ]; then
          export GIT_AUTHOR_NAME="${answers.newName}";
          export GIT_AUTHOR_EMAIL="${answers.newEmail}";
      fi
    `;
    await executeRewrite(filterScript);
  } else {
    console.log(chalk.red("All fields are required. Aborting."));
  }
}

/**
 * Creates a filter script to rewrite author info for specific commit hashes.
 */
async function handleRewriteByHash() {
  const answers = await inquirer.prompt([
    { type: "input", name: "newName", message: "Enter the new author name:" },
    { type: "input", name: "newEmail", message: "Enter the new author email:" },
    {
      type: "input",
      name: "commitHashesStr",
      message: "Enter commit hashes to rewrite (space or comma separated):",
    },
  ]);

  if (answers.newName && answers.newEmail && answers.commitHashesStr) {
    const commitHashes = answers.commitHashesStr
      .split(/[\s,]+/)
      .filter((h: string) => h);
    if (commitHashes.length > 0) {
      const hashesAsPattern = commitHashes.join("\\|");
      const filterScript = `
        if echo "$GIT_COMMIT" | grep -q -E "${hashesAsPattern}"; then
            export GIT_AUTHOR_NAME="${answers.newName}";
            export GIT_AUTHOR_EMAIL="${answers.newEmail}";
            export GIT_COMMITTER_NAME="${answers.newName}";
            export GIT_COMMITTER_EMAIL="${answers.newEmail}";
        fi
      `;
      await executeRewrite(filterScript);
    } else {
      console.log(
        chalk.red("Please provide at least one commit hash. Aborting.")
      );
    }
  } else {
    console.log(chalk.red("All fields are required. Aborting."));
  }
}

rewriteCommand
  .description("Rewrite git commit history using native git commands.")
  .action(async () => {
    if (!shell.which("git")) {
      console.log(
        chalk.red("Error: `git` is not installed or not in your PATH.")
      );
      return;
    }

    const { rewriteType } = await inquirer.prompt([
      {
        type: "list",
        name: "rewriteType",
        message: "What kind of commit history rewrite do you want to perform?",
        choices: [
          { name: "Rewrite author for ALL commits in history", value: "all" },
          {
            name: "Rewrite author for commits from a specific email",
            value: "byEmail",
          },
          {
            name: "Rewrite author for specific commits by hash",
            value: "byHash",
          },
        ],
      },
    ]);

    switch (rewriteType) {
      case "all":
        await handleRewriteAll();
        break;
      case "byEmail":
        await handleRewriteByEmail();
        break;
      case "byHash":
        await handleRewriteByHash();
        break;
    }
  });

export default rewriteCommand;
