const core = require('@actions/core');
const github = require('@actions/github');

// When used, this requiredArgOptions will error if a value has not been provided.
const requiredArgOptions = {
  required: true,
  trimWhitespace: true,
};

const token = core.getInput('github-token', requiredArgOptions);
const octokit = github.getOctokit(token);
const { owner, repo } = github.context.repo;

const commentId = core.getInput('comment-identifier', requiredArgOptions);
const commentContent = core.getInput('comment-content', requiredArgOptions);

const commentStart = '<!-- im-open/update-pr-comment';
const commentEnd = '-->';
const markupPrefix = `${commentStart} - ${commentId} ${commentEnd}`;

async function lookForExistingComment() {
  let hasMoreComments = true;
  let page = 1;
  const maxResultsPerPage = 30;

  while (hasMoreComments) {
    // eslint-disable-next-line no-await-in-loop
    const commentsResponse = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: github.context.payload.pull_request.number,
      per_page: maxResultsPerPage,
      page,
    });
    const { data, status: resultStatus } = commentsResponse;

    if (resultStatus === 200 && data) {
      if (data.length < maxResultsPerPage) {
        hasMoreComments = false;
      } else {
        page += 1;
      }

      const existingComment = data.find((c) => c.body.startsWith(markupPrefix));
      if (existingComment) {
        core.info(
          `An existing comment (${existingComment.id}) for ${commentId} was found and will be updated.`,
        );
        return existingComment.id;
      }
    } else {
      core.info(
        `Failed to list PR comments. Error code: ${commentsResponse.status}.  Will create new comment instead.`,
      );
      return null;
    }
  }

  core.info(`Finished getting comments for PR #${github.context.payload.pull_request.number}.`);
  core.info(`An existing comment for ${commentId} was not found, will create a new one instead.`);

  return null;
}

async function createOrUpdateComment() {
  try {
    core.info('Checking for existing comment on PR....');
    const existingCommentId = await lookForExistingComment(octokit);
    const body = `${markupPrefix}\n${commentContent}`;
    const successStatus = existingCommentId ? 200 : 201;
    const infoMessage = existingCommentId
      ? `Updating existing PR #${existingCommentId} comment...`
      : 'Creating a new PR comment...';
    const issueFunc = existingCommentId ? 'updateComment' : 'createComment';
    const action = existingCommentId ? 'create' : 'update';

    core.info(infoMessage());
    const {
      status,
      data: { id: updatedCommentId },
    } = await octokit.rest.issues[issueFunc]({
      owner,
      repo,
      body,
      ...(existingCommentId
        ? { comment_id: existingCommentId }
        : { issue_number: github.context.payload.pull_request.number }),
    });

    if (status === successStatus) {
      core.info(`PR comment was ${action}d.  ID: ${updatedCommentId}.`);
    } else {
      core.setFailed(`Failed to ${action} PR comment. Error code: ${status}.`);
    }
  } catch (error) {
    core.setFailed(`An error occurred trying to create or update the PR comment: ${error}`);
  }
}

async function run() {
  if (github.context.eventName !== 'pull_request') {
    core.info(
      'This event was not triggered by a pull_request.  No comment will be created or updated.',
    );
    return;
  }

  try {
    await createOrUpdateComment();
  } catch (error) {
    core.setFailed(`An error occurred processing the summary file: ${error}`);
  }
}

run();
