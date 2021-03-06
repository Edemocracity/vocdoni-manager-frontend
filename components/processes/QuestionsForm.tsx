import { Input, Form, Button } from 'antd'
import { str } from 'dot-object'
import { MultiLanguage } from 'dvote-js'
import React, { Component, ReactNode } from 'react'

import Ficon from '../ficon'
import HTMLEditor from '../html-editor'

type VoteOption = {
    title: MultiLanguage<string>,
    value?: number,
}

export type LegacyVoteOption = {
    title: MultiLanguage<string>,
    // Values are made optional in this type to properly map them when sending results
    value: number,
}
export type QuestionType = 'single-choice'
export type LegacyQuestion = {
    type: QuestionType,
    question?: MultiLanguage<string>,
    description: MultiLanguage<string>,
    voteOptions: LegacyVoteOption[],
}
type Question = {
    type: QuestionType,
    question?: MultiLanguage<string>,
    description: MultiLanguage<string>,
    voteOptions: VoteOption[],
}
type Questions = Question[]
export type LegacyQuestions = LegacyQuestion[]

type Props = {
    onChange: (questions: LegacyQuestions) => void,
}

type State = {
    questions: Questions,
}

const qt = () : Question => ({
    type: 'single-choice',
    question: {
        default: '',
    },
    description: {
        default: '',
    },
    voteOptions: [
        {
            title: {
                default: 'Yes',
            },
        },
        {
            title: {
                default: 'No',
            },
        },
        {
            title: {
                default: 'Blank',
            },
        }
    ]
})

export default class QuestionsForm extends Component<Props, State> {
    state : State = {
        questions: [
            qt(),
        ],
    }

    /**
     * Sets the `value` field for each voteOption with their proper index
     *
     * @param questions Questions from state (without `value` field)
     */
    onChange(questions: Questions) : void {
        for (const q in questions) {
            const question = questions[q]
            for (const o in question.voteOptions) {
                questions[q].voteOptions[o].value = o as unknown as number
            }
        }

        this.props.onChange(questions as LegacyQuestions)
    }

    /**
     * Sets the default questions template by default.
     */
    componentDidMount() : void {
        this.onChange(this.state.questions)
    }

    /**
     * Adds a (new and empty) question.
     */
    addQuestion() : void {
        const {questions} = this.state
        questions.push(qt())
        this.setState({questions})
    }

    /**
     * Adds a new option to the specified question.
     *
     * @param qi Question index
     */
    addOption(qi: number) : void {
        const questions = [...this.state.questions]
        questions[qi].voteOptions.push({
            title: {
                default: '',
            },
        })

        this.setState({questions})
        this.onChange(questions)
    }

    onFieldChange(field: string, {target: {value}}: React.ChangeEvent<HTMLInputElement>) : void {
        this.setFieldValue(field, value)
    }

    setFieldValue(field: string, value: string) : void {
        const state = {...this.state}
        str(field, value, state)
        this.setState(state)
        this.onChange(state.questions)
    }

    /**
     * Removes an option from a question
     *
     * @param qi Question index
     * @param oi Option index
     */
    removeOption(qi: number, oi: number) : void {
        const questions = [...this.state.questions]
        questions[qi].voteOptions.splice(oi, 1)

        this.setState({questions})
        this.onChange(questions)
    }

    /**
     * Removes an entire question (with its options ofc)
     *
     * @param qi Question index
     */
    removeQuestion(qi: number) : void {
        const questions = [...this.state.questions]
        questions.splice(qi, 1)

        this.setState({questions})
        this.onChange(questions)
    }

    render() : ReactNode {
        const {questions} = this.state
        return (
            <div className='questions-form'>
                <ol>
                    {
                        questions.map((q, i) => (
                            <li key={i}>
                                <Form.Item>
                                    <Input
                                        value={q.question.default}
                                        addonAfter={(
                                            <Button
                                                size='small'
                                                disabled={questions.length <= 1}
                                                onClick={this.removeQuestion.bind(this, i)}
                                            >
                                                <Ficon icon='X' />
                                            </Button>
                                        )}
                                        onChange={
                                            this.onFieldChange.bind(this, `questions[${i}].question.default`)
                                        }
                                    />
                                </Form.Item>
                                <Form.Item>
                                    <HTMLEditor
                                        toolbar='simple'
                                        value={q.description.default}
                                        onContentChanged={
                                            this.setFieldValue.bind(this, `questions[${i}].description.default`)
                                        }
                                    />
                                </Form.Item>
                                <ol>
                                    {
                                        q.voteOptions.map((o, k) => (
                                            <li key={`${i}-${k}`}>
                                                <Form.Item>
                                                    <Input
                                                        value={o.title.default}
                                                        onChange={
                                                            this.onFieldChange.bind(
                                                                this,
                                                                `questions[${i}].voteOptions[${k}].title.default`
                                                            )
                                                        }
                                                        addonAfter={(
                                                            <Button
                                                                size='small'
                                                                type='text'
                                                                disabled={q.voteOptions.length <= 2}
                                                                onClick={this.removeOption.bind(this, i, k)}
                                                            >
                                                                <Ficon icon='X' />
                                                            </Button>
                                                        )}
                                                    />
                                                </Form.Item>
                                            </li>
                                        ))
                                    }
                                </ol>
                                <Button type='link' onClick={this.addOption.bind(this, i)}>
                                    + Add option
                                </Button>
                            </li>
                        ))
                    }
                </ol>
                <Button type='link' onClick={this.addQuestion.bind(this)}>
                    + Add question
                </Button>
            </div>
        )
    }
}
