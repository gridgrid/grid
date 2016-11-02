We use semantic release so if you don't already have it:

`npm i -g commitizen`

to commit run `git cz` (or if you're a really good commitizen just alias your favorite commit alias to that)

see [semantic release](https://github.com/semantic-release/semantic-release) for guidelines on how to make commits. we use the standard conventional changelog format.

there is an automagic circle ci build setup on the master branch which will publish based on your commits as described in the doc above so there's no need to manage npm access or even think about which version to bump.

please first submit prs if you are an org member.
