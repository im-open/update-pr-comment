import core from '@actions/core';
import github from '@actions/github';

// When used, this requiredArgOptions will error if a value has not been provided.
const requiredArgOptions = {
  required: true,
  trimWhitespace: true,
};

const token = core.getInput('github-token', requiredArgOptions);
const octokit = github.getOctokit(token);
const { repo: contextRepo, payload: githubPaylod } = github.context;
const { pull_request: pullRequest } = githubPaylod;
const { owner, repo } = contextRepo;
const prNumber = pullRequest?.number || 0;

const commentId = core.getInput('comment-identifier', requiredArgOptions);
const commentContent = core.getInput('comment-content', requiredArgOptions);

const commentStart = '<!--';
const commentPackageName = 'im-open/update-pr-comment';
const commentEnd = '-->';
const markupPrefix = `${commentStart} ${commentPackageName} - ${commentId} ${commentEnd}`;

async function findExistingComment() {
  if (!pullRequest) return;

  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: prNumber,
  });

  if (!comments.length) {
    core.info(
      `An existing comment for ${commentId} was not found on PR #${prNumber}, will create a new one instead.`,
    );

    return null;
  }

  const existingComment = comments.find((c) => c.body?.startsWith(markupPrefix));
  if (existingComment) {
    core.info(
      `An existing comment (${existingComment.id}) for ${commentId} was found on PR #${prNumber} and will be updated.`,
    );

    return existingComment.id;
  }
}

async function updateComment(body: string, existingCommentId: number) {
  const requestParams = {
    owner,
    repo,
    body,
    comment_id: existingCommentId,
  };

  return octokit.rest.issues.updateComment(requestParams);
}

async function createComment(body: string) {
  const requestParams = {
    owner,
    repo,
    body,
    issue_number: prNumber,
  };

  return octokit.rest.issues.createComment(requestParams);
}

async function createOrUpdateComment() {
  if (!pullRequest) return;

  try {
    core.info('Checking for existing comment on PR....');
    const existingCommentId = await findExistingComment();
    const body = `${markupPrefix}\n${commentContent}`;
    const successStatus = existingCommentId ? 200 : 201;
    const infoMessage = existingCommentId
      ? `Updating existing PR #${existingCommentId} comment...`
      : 'Creating a new PR comment...';
    const action = existingCommentId ? 'update' : 'create';

    core.info(infoMessage);

    const {
      status,
      data: { id: updatedCommentId },
    } = existingCommentId
      ? await updateComment(body, existingCommentId as number)
      : await createComment(body);

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
