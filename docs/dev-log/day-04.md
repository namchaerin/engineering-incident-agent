## Agent Evaluation

10개의 고정 시나리오를 통해 Agent 동작을 검증했다.

- Tool selection
- Multi-tool execution
- Grounding
- Missing information handling
- General / internal question routing

평가 과정에서 Capability Overclaim 문제를 발견했다.

내부 시스템 질문에 대해 검색된 문서에 없는
일반적인 운영 지식을 추가하는 문제가 있었으며,
Agent instruction에 capability boundary와 grounding policy를 추가했다.

수정 후 동일 시나리오를 재검증하여 해결을 확인했다.

상세 평가 결과:
`docs/evaluation/agent-evaluation-v0.1.md`