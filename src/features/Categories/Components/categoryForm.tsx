import { useForm, Controller } from "react-hook-form";
import type { categoryFormData } from "../category.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema } from "../category.schema";
import { styles } from "./CategoryForm.styles";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import FormLabel from "@mui/material/FormLabel";
import { useState } from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryKeys } from "../category.types";
import { addCategoryMutationOption } from "../category.query";
import { useNavigate } from "@tanstack/react-router";

export default function CategoryForm(){
    const{control, handleSubmit, reset,
        formState:{isSubmitted, isValid, isSubmitting}} = useForm<categoryFormData>({resolver: zodResolver(categorySchema),
        defaultValues:{category:"", categoryDescription:""}, mode:"onSubmit", reValidateMode:"onChange"
    });

    const categoryMutation = useMutation(addCategoryMutationOption());
    const queryClient = useQueryClient();

    const[snackBar, setSnackBar] = useState({open:false, message:"", 
        severity:"success" as "success" | "error"});

    const navigate = useNavigate();

    async function onValidSubmit(data:categoryFormData){
        try {
            await categoryMutation.mutateAsync({category_name:data.category, category_notes:data.categoryDescription});
            await queryClient.invalidateQueries({queryKey: categoryKeys.categoryNamesKey});

            setSnackBar({open:true,
                message: "Category added successfully", severity:"success"
            })

            reset();
            
            await navigate({to:"/admin/categories"})

        } catch (error) {
            setSnackBar({open:true,
                message: "Failed to add category", severity:"error"
            })
            console.log(error)
        }
    }

    function closeSnackBar() {
        setSnackBar(previous => ({...previous, open:false}))
    }

    return(
        <>
            <Box component="section" sx={styles.layout}>
                <Box>
                    <Typography component="h2" variant="h3" sx={styles.heading}>
                        Add a new Category
                    </Typography>

                    <Typography sx={styles.description}>
                        Start with a name, and add a description
                        that helps Admins and customers understand your category.
                    </Typography>
                </Box>

                <Paper elevation={0} sx={styles.card}>
                    <Box
                        component="form"
                        onSubmit={handleSubmit(onValidSubmit)}
                        sx={styles.form}>
                            <Stack spacing={3}>
                                <Typography component="h3" variant="h6" sx={styles.formTitle}>
                                    category name
                                </Typography>

                                <Controller control={control} name="category" render={({field: {ref, ...field}, fieldState}) => (
                                    <Box sx={styles.fieldGroup}>
                                        <FormLabel htmlFor="category-name" error={!!fieldState.error} sx={styles.fieldLabel}>
                                            Category name
                                        </FormLabel>
                                        <TextField
                                            {...field}
                                            inputRef={ref}
                                            id="category-name"
                                            variant="outlined"
                                            size="small"
                                            fullWidth
                                            sx={styles.textField}
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                        />
                                    </Box>
                                )}/>


                                <Controller control={control} name="categoryDescription" render={({field: {ref, ...field}, fieldState}) =>(
                                    <Box sx={styles.fieldGroup}>
                                        <FormLabel htmlFor="category-description" error={!!fieldState.error} sx={styles.fieldLabel}>
                                            Description
                                        </FormLabel>
                                        <TextField
                                            {...field}
                                            inputRef={ref}
                                            id="category-description"
                                            variant="outlined"
                                            size="small"
                                            fullWidth
                                            sx={styles.textField}
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                        />
                                    </Box>
                                )}/>


                                <Button type="submit" variant="contained" sx={styles.submitButton}
                                disabled={(isSubmitted && !isValid) || isSubmitting}
                                >Submit</Button>
                            
                            </Stack>
                    </Box>
                </Paper>
            </Box>

            <Snackbar
                open={snackBar.open}
                autoHideDuration={6000}
                onClose={closeSnackBar}
                anchorOrigin={{
                vertical: "bottom",
                horizontal: "center"
                }}
            >
            <Alert
                severity={snackBar.severity}
                onClose={closeSnackBar}
            >
            {snackBar.message}
            </Alert>
        </Snackbar>
        </>
    );
}
