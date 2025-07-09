import { Command } from "commander";
import createCommand from './commands/create';
import genCommand from './commands/gen';
import rewriteCommand from './commands/rewrite';

const program = new Command();

program
  .name("npm-cli")
  .description(
    "A CLI tool for creating projects and generating files from templates."
  )
  .version("1.0.0");

program.addCommand(createCommand);
program.addCommand(genCommand);
program.addCommand(rewriteCommand);

program.parse(process.argv);
